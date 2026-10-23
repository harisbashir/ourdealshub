"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { autoPostPublishedDeal } from "@/lib/social-publish";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireProductAccess, requireSuperAdmin } from "@/lib/admin-auth";
import {
  extractAsin,
  isAmazonConfigured,
  lookupAmazonProduct,
} from "@/lib/amazon";
import {
  isAmazonCdnImageUrl,
  isAmazonProductUrl,
  isSafeAffiliateRedirectUrl,
  normalizeAdminAffiliateUrl,
} from "@/lib/affiliate-url";
import { canManageOwnedProduct, isSuperAdmin } from "@/lib/permissions";
import {
  generateProductContent,
  getDefaultGeminiPrompt,
  isGeminiConfigured,
} from "@/lib/gemini";
import { getSiteSettings } from "@/lib/settings";
import {
  normalizeCategoryPath,
  resolveFallbackCategoryId,
  resolveOrCreateCategoryFromPath,
} from "@/lib/category-resolve";
import {
  getAdminTrackingId,
  MISSING_TRACKING_ID_MESSAGE,
  MISSING_UK_TRACKING_ID_MESSAGE,
  trackingIdForProductUpdate,
} from "@/lib/admin-tracking";
import { rateLimitDurable } from "@/lib/rate-limit-durable";
import { associatesClaimError } from "@/lib/associates-claims";
import {
  detectMarketplaceFromInput,
  parseMarketplace,
  type MarketplaceCode,
} from "@/lib/marketplace";

export type ImportStep = {
  id: string;
  label: string;
  status: "pending" | "done" | "failed" | "skipped";
};

export type ImportPreview = {
  asin: string;
  title: string;
  description: string;
  imageUrl: string;
  affiliateUrl: string;
  /** Display-only — never trusted from client on publish */
  trackingId: string;
  dealPost: string;
  categoryId: string;
  categoryLabel: string;
  marketplace: MarketplaceCode;
  existingProductId: string | null;
};

export type ImportResult =
  | {
      ok: true;
      mode: "published";
      productId: string;
      slug: string;
      message: string;
      steps: ImportStep[];
    }
  | {
      ok: true;
      mode: "preview";
      preview: ImportPreview;
      message: string;
      steps: ImportStep[];
    }
  | {
      ok: false;
      error: string;
      failures?: string[];
      partial?: Partial<ImportPreview>;
      steps: ImportStep[];
    };

function step(
  id: string,
  label: string,
  status: ImportStep["status"]
): ImportStep {
  return { id, label, status };
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `deal-${Date.now().toString(36)}`;
  const clash = await prisma.product.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

/**
 * Existing (non-archived) deal for the same ASIN in the same marketplace,
 * from ANY admin — a product should appear only once on the public site.
 * US and UK listings of one ASIN are separate deals.
 */
async function findDuplicateDeal(
  asin: string | null,
  marketplace: MarketplaceCode,
  affiliateUrl: string
) {
  const select = { id: true, slug: true, title: true, createdById: true };
  if (asin) {
    const byAsin = await prisma.product.findFirst({
      where: { asin, marketplace, deletedAt: null },
      select,
    });
    if (byAsin) return byAsin;
  }
  return prisma.product.findFirst({
    where: { affiliateUrl, deletedAt: null },
    select,
  });
}

/**
 * URL/ASIN → Amazon → Gemini JSON {title,description} → affiliate link → save.
 * Tracking ID always from authenticated admin DB record for the selected marketplace.
 */
export async function importProductFromUrl(
  url: string,
  marketplaceInput: string = "US"
): Promise<ImportResult> {
  const steps: ImportStep[] = [
    step("url", "URL / ASIN received", "done"),
    step("asin", "ASIN identified", "pending"),
    step("amazon", "Amazon data retrieved", "pending"),
    step("image", "Product image retrieved", "pending"),
    step("affiliate", "Affiliate link generated", "pending"),
    step("gemini", "Gemini content generated", "pending"),
    step("saved", "Product saved", "pending"),
    step("published", "Product published", "pending"),
  ];

  const mark = (id: string, status: ImportStep["status"]) => {
    const s = steps.find((x) => x.id === id);
    if (s) s.status = status;
  };

  const admin = await requireProductAccess();

  const limited = await rateLimitDurable(`import:${admin.id}`, 40, 60 * 60_000);
  if (!limited.ok) {
    return {
      ok: false,
      error: `Import rate limit reached. Try again in ~${limited.retryAfterSec}s.`,
      steps,
    };
  }

  const input = url.trim();

  if (!input) {
    return {
      ok: false,
      error: "Paste an Amazon product URL or ASIN.",
      steps,
    };
  }

  const detected = detectMarketplaceFromInput(input);
  const marketplace = detected || parseMarketplace(marketplaceInput);

  const trackingId = await getAdminTrackingId(admin.id, marketplace);
  if (!trackingId) {
    const msg =
      marketplace === "UK"
        ? MISSING_UK_TRACKING_ID_MESSAGE
        : MISSING_TRACKING_ID_MESSAGE;
    return {
      ok: false,
      error: msg,
      failures: [msg],
      steps,
    };
  }

  const asinEarly = extractAsin(input);
  if (!asinEarly) {
    mark("asin", "failed");
    return {
      ok: false,
      error:
        "Enter a valid Amazon product URL or a 10-character ASIN (e.g. B0XXXXXXXX).",
      steps,
    };
  }
  mark("asin", "done");

  const failures: string[] = [];

  if (!isAmazonConfigured()) {
    mark("amazon", "failed");
    return {
      ok: false,
      error:
        "Amazon API is not configured on the server. Add AMAZON_* env vars.",
      failures: ["Amazon API credentials missing"],
      steps,
    };
  }

  let fetched: Awaited<ReturnType<typeof lookupAmazonProduct>>;
  try {
    fetched = await lookupAmazonProduct(input, trackingId, marketplace);
    mark("amazon", "done");
    mark("image", fetched.imageUrl ? "done" : "failed");
    mark("affiliate", fetched.detailPageUrl ? "done" : "failed");
  } catch (err) {
    mark("amazon", "failed");
    const message =
      err instanceof Error ? err.message : "Amazon lookup failed.";
    return {
      ok: false,
      error: message,
      failures: [message],
      partial: {
        asin: asinEarly,
        trackingId,
        marketplace,
      },
      steps,
    };
  }

  const settings = await getSiteSettings();

  const normalized = normalizeCategoryPath(fetched.categoryPath);
  let resolved = normalized
    ? await resolveOrCreateCategoryFromPath(normalized, {
        allowCreate: isSuperAdmin(admin),
      })
    : null;

  if (!resolved) {
    resolved = await resolveFallbackCategoryId(settings.defaultCategoryId);
  }

  if (!resolved) {
    return {
      ok: false,
      error:
        "Could not determine a category from Amazon and no fallback category exists.",
      failures: ["Category could not be resolved from Amazon browse nodes"],
      steps,
    };
  }

  if (resolved.created) {
    failures.push(`Category set from Amazon: ${resolved.label}`);
  }

  const categoryId = resolved.categoryId;
  const categoryLabel = resolved.label;

  // Amazon title/description as factual source for Gemini only
  let productTitle = fetched.title;
  let productDescription = fetched.description;
  let dealPost = fetched.description;

  if (!isGeminiConfigured()) {
    mark("gemini", "skipped");
    failures.push(
      "Gemini API is not configured — using Amazon title/description."
    );
  } else {
    try {
      const generated = await generateProductContent({
        title: fetched.title,
        description: fetched.description,
        promptTemplate: settings.geminiPromptTemplate,
      });
      // Gemini → Product.title + Product.description (dealPost mirrors for public UI)
      productTitle = generated.title;
      productDescription = generated.description;
      dealPost = generated.description;
      mark("gemini", "done");
    } catch (err) {
      mark("gemini", "failed");
      const message =
        err instanceof Error ? err.message : "Gemini generation failed.";
      failures.push(message);
      productDescription = fetched.description;
      dealPost = fetched.description;
    }
  }

  const claimErrEarly = associatesClaimError({
    title: productTitle,
    description: productDescription,
    dealPost,
  });
  if (claimErrEarly) {
    failures.push(claimErrEarly);
    productTitle = fetched.title;
    productDescription = fetched.description;
    dealPost = fetched.description;
    const fallbackClaim = associatesClaimError({
      title: productTitle,
      description: productDescription,
      dealPost,
    });
    if (fallbackClaim) {
      return {
        ok: false,
        error: `Associates copy blocked: ${fallbackClaim}`,
        failures,
        steps,
        partial: {
          asin: fetched.asin,
          title: productTitle,
          description: productDescription,
          imageUrl: fetched.imageUrl,
          affiliateUrl: fetched.detailPageUrl,
          trackingId,
          dealPost,
          categoryId,
          categoryLabel,
          marketplace,
        },
      };
    }
  }

  const existing = await findDuplicateDeal(
    fetched.asin,
    marketplace,
    fetched.detailPageUrl
  );

  if (existing && !canManageOwnedProduct(admin, existing)) {
    mark("saved", "failed");
    return {
      ok: false,
      error: `This ${marketplace} product is already on the site (added by another admin).`,
      failures: [`Existing deal: ${existing.title}`],
      steps,
    };
  }

  const preview: ImportPreview = {
    asin: fetched.asin,
    title: productTitle,
    description: productDescription,
    imageUrl: fetched.imageUrl,
    affiliateUrl: fetched.detailPageUrl,
    trackingId,
    dealPost,
    categoryId,
    categoryLabel,
    marketplace,
    existingProductId: existing?.id || null,
  };

  if (existing && settings.autoPublish) {
    mark("saved", "failed");
    return {
      ok: false,
      error: "You already added this product.",
      failures: [`Existing deal: ${existing.title}`],
      partial: preview,
      steps,
    };
  }

  if (!settings.autoPublish || existing) {
    mark("saved", "skipped");
    mark("published", "skipped");
    return {
      ok: true,
      mode: "preview",
      preview,
      message: existing
        ? `You already added this ${marketplace} product. Review and update it, or cancel.`
        : `Review the deal (${marketplace} · ${categoryLabel}), then publish.`,
      steps,
    };
  }

  const slug = await uniqueProductSlug(productTitle);
  const product = await prisma.product.create({
    data: {
      title: productTitle,
      slug,
      description: productDescription,
      dealPost,
      imageUrl: fetched.imageUrl,
      affiliateUrl: fetched.detailPageUrl,
      asin: fetched.asin,
      trackingId,
      marketplace,
      categoryId,
      createdById: admin.id,
      isPublished: true,
      lastSyncedAt: new Date(),
      couponCode: null,
    },
  });

  mark("saved", "done");
  mark("published", "done");

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath(`/deal/${slug}`);

  after(async () => {
    try {
      await autoPostPublishedDeal(product.id);
    } catch {
      /* ignore */
    }
  });

  return {
    ok: true,
    mode: "published",
    productId: product.id,
    slug: product.slug,
    message: failures.length
      ? `Published · ${marketplace} under ${categoryLabel}. ${failures.join("; ")}`
      : `Published · ${marketplace} under ${categoryLabel}.`,
    steps,
  };
}

export async function publishImportedProduct(data: {
  title: string;
  description: string;
  dealPost: string;
  imageUrl: string;
  affiliateUrl: string;
  asin: string | null;
  categoryId: string;
  marketplace?: string;
  existingProductId?: string | null;
  isTrending?: boolean;
}): Promise<ImportResult> {
  const steps: ImportStep[] = [
    step("saved", "Product saved", "pending"),
    step("published", "Product published", "pending"),
  ];

  const admin = await requireProductAccess();
  const marketplace = parseMarketplace(data.marketplace);

  const limited = await rateLimitDurable(
    `import-publish:${admin.id}`,
    60,
    60 * 60_000
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: `Publish rate limit reached. Try again in ~${limited.retryAfterSec}s.`,
      steps,
    };
  }

  const trackingId = await getAdminTrackingId(admin.id, marketplace);
  if (!trackingId) {
    const msg =
      marketplace === "UK"
        ? MISSING_UK_TRACKING_ID_MESSAGE
        : MISSING_TRACKING_ID_MESSAGE;
    return {
      ok: false,
      error: msg,
      failures: [msg],
      steps,
    };
  }

  const title = data.title.trim().slice(0, 500);
  const description = data.description.trim().slice(0, 8000) || null;
  const dealPost = data.dealPost.trim().slice(0, 12000) || null;
  const imageUrl = data.imageUrl.trim().slice(0, 2000);
  const asin =
    data.asin?.trim().toUpperCase().slice(0, 10) ||
    extractAsin(data.affiliateUrl) ||
    null;
  const categoryId = data.categoryId.trim();

  const missing: string[] = [];
  if (!title) missing.push("Product title is missing");
  if (!imageUrl) missing.push("Product image is missing");
  if (!categoryId) missing.push("Category is required");
  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    missing.push("Valid Amazon ASIN is required");
  }
  if (imageUrl && !isAmazonCdnImageUrl(imageUrl)) {
    missing.push("Image must be an Amazon CDN URL");
  }
  if (
    data.affiliateUrl.trim() &&
    !isAmazonProductUrl(data.affiliateUrl.trim())
  ) {
    missing.push("Affiliate link must be a real Amazon product URL");
  }

  let affiliateUrl = "";
  if (asin && /^[A-Z0-9]{10}$/.test(asin)) {
    try {
      const normalized = normalizeAdminAffiliateUrl({
        affiliateUrl: data.affiliateUrl.trim() || "",
        asin,
        trackingId,
        marketplace,
      });
      affiliateUrl = normalized.affiliateUrl;
    } catch (e) {
      missing.push(
        e instanceof Error ? e.message : "Could not build affiliate link"
      );
    }
  }
  if (affiliateUrl && !isSafeAffiliateRedirectUrl(affiliateUrl)) {
    missing.push("Affiliate link is not a safe Amazon URL");
  }

  const claimErr = associatesClaimError({
    title,
    description,
    dealPost,
  });
  if (claimErr) missing.push(claimErr);

  const categoryExists = categoryId
    ? await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      })
    : null;
  if (categoryId && !categoryExists) {
    missing.push("Selected category does not exist");
  }

  if (missing.length) {
    return { ok: false, error: "Incomplete product.", failures: missing, steps };
  }

  if (data.existingProductId) {
    const existing = await prisma.product.findUnique({
      where: { id: data.existingProductId },
    });
    if (!existing || existing.deletedAt) {
      return { ok: false, error: "Existing product not found.", steps };
    }
    if (!canManageOwnedProduct(admin, existing)) {
      return {
        ok: false,
        error: "This product belongs to another admin.",
        steps,
      };
    }

    const slug =
      title !== existing.title
        ? await uniqueProductSlug(title, existing.id)
        : existing.slug;

    // Keep the deal's owner + their Associates tag (a Super Admin update must
    // not move the commission to the editor). Same rule as updateProduct.
    let ownerTrackingId: string;
    let ownerAffiliateUrl: string;
    try {
      ownerTrackingId = await trackingIdForProductUpdate(admin, {
        ...existing,
        marketplace,
      });
      ownerAffiliateUrl = normalizeAdminAffiliateUrl({
        affiliateUrl: affiliateUrl,
        asin,
        trackingId: ownerTrackingId,
        marketplace,
      }).affiliateUrl;
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : "Could not build affiliate link",
        steps,
      };
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        description,
        dealPost,
        imageUrl,
        affiliateUrl: ownerAffiliateUrl,
        asin: asin && /^[A-Z0-9]{10}$/.test(asin) ? asin : existing.asin,
        trackingId: ownerTrackingId,
        marketplace,
        categoryId,
        createdById: existing.createdById ?? admin.id,
        isPublished: true,
        deletedAt: null,
        lastSyncedAt: new Date(),
        isTrending: data.isTrending ?? existing.isTrending,
        couponCode: null,
      },
    });

    markDone(steps);
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/deal/${slug}`);

    after(async () => {
      try {
        await autoPostPublishedDeal(existing.id);
      } catch {
        /* ignore */
      }
    });

    return {
      ok: true,
      mode: "published",
      productId: existing.id,
      slug,
      message: `Updated · ${marketplace} and published.`,
      steps,
    };
  }

  const dup = await findDuplicateDeal(asin, marketplace, affiliateUrl);
  if (dup && !canManageOwnedProduct(admin, dup)) {
    return {
      ok: false,
      error: `This ${marketplace} product is already on the site (added by another admin).`,
      failures: [`Existing deal: ${dup.title}`],
      steps,
    };
  }
  if (dup) {
    return {
      ok: false,
      error: "You already added this product.",
      failures: [`Existing deal: ${dup.title}`],
      partial: {
        existingProductId: dup.id,
        title,
        description: description || "",
        dealPost: dealPost || "",
        imageUrl,
        affiliateUrl,
        trackingId,
        asin: asin || "",
        categoryId,
        marketplace,
      },
      steps,
    };
  }

  const slug = await uniqueProductSlug(title);
  const product = await prisma.product.create({
    data: {
      title,
      slug,
      description,
      dealPost,
      imageUrl,
      affiliateUrl,
      asin: asin && /^[A-Z0-9]{10}$/.test(asin) ? asin : null,
      trackingId,
      marketplace,
      categoryId,
      createdById: admin.id,
      isPublished: true,
      lastSyncedAt: new Date(),
      isTrending: Boolean(data.isTrending),
      couponCode: null,
    },
  });

  markDone(steps);
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/deal/${slug}`);

  after(async () => {
    try {
      await autoPostPublishedDeal(product.id);
    } catch {
      /* ignore */
    }
  });

  return {
    ok: true,
    mode: "published",
    productId: product.id,
    slug: product.slug,
    message: `Published · ${marketplace}.`,
    steps,
  };
}

function markDone(steps: ImportStep[]) {
  for (const s of steps) s.status = "done";
}

export async function updateSiteSettings(formData: FormData) {
  await requireSuperAdmin();

  const geminiPromptTemplate =
    String(formData.get("geminiPromptTemplate") || "").trim() ||
    getDefaultGeminiPrompt();
  const autoPublish = formData.get("autoPublish") === "on";
  const socialAutoPost = formData.get("socialAutoPost") === "on";
  const defaultCategoryId =
    String(formData.get("defaultCategoryId") || "").trim() || null;

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      geminiPromptTemplate,
      autoPublish,
      socialAutoPost,
      defaultCategoryId,
    },
    update: {
      geminiPromptTemplate,
      autoPublish,
      socialAutoPost,
      defaultCategoryId,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin/automation");
}
