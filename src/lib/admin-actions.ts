"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  requireAdminSession,
  requireProductAccess,
  requireSuperAdmin,
} from "@/lib/admin-auth";
import { canManageOwnedProduct, isSuperAdmin } from "@/lib/permissions";
import { normalizeTrackingId } from "@/lib/tracking";
import {
  extractAsin,
  isAmazonConfigured,
  lookupAmazonProduct,
} from "@/lib/amazon";
import {
  getAdminTrackingId,
  MISSING_TRACKING_ID_MESSAGE,
  trackingIdForProductUpdate,
  MISSING_UK_TRACKING_ID_MESSAGE,
} from "@/lib/admin-tracking";
import type { SessionAdmin } from "@/lib/permissions";
import {
  isAmazonCdnImageUrl,
  isAmazonProductUrl,
  normalizeAdminAffiliateUrl,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/affiliate-url";
import {
  detectMarketplaceFromInput,
  parseMarketplace,
} from "@/lib/marketplace";
import {
  assertAssociatesSafeCopy,
  normalizeCategoryBadge,
} from "@/lib/associates-claims";
import { rateLimitDurable } from "@/lib/rate-limit-durable";
import { autoPostPublishedDeal } from "@/lib/social-publish";
import { after } from "next/server";

const emailSchema = z.email().max(200);
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine(
    (p) => /[A-Za-z]/.test(p) && /\d/.test(p),
    "Password must include at least one letter and one number"
  )
  .refine(
    (p) => !/^(password|admin123|change-me|12345678|password1|admin1234)$/i.test(p),
    "Choose a stronger password"
  )
  .refine((p) => !/^(.)\1+$/.test(p), "Password cannot be a single repeated character");

/** Super Admin can manage all; normal admins only their own products. */
async function assertCanManageProduct(
  admin: SessionAdmin,
  product: { createdById: string | null }
) {
  if (!canManageOwnedProduct(admin, product)) {
    throw new Error("You do not have permission to modify this product.");
  }
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseProductFields(formData: FormData) {
  const title = String(formData.get("title") || "").trim().slice(0, 500);
  const description =
    String(formData.get("description") || "").trim().slice(0, 8000) || null;
  const dealPost =
    String(formData.get("dealPost") || "").trim().slice(0, 12000) || null;
  const imageUrl = String(formData.get("imageUrl") || "").trim().slice(0, 2000);
  const affiliateUrl = String(formData.get("affiliateUrl") || "")
    .trim()
    .slice(0, 2000);
  // Coupon codes disabled — no verified coupon source
  const couponCode = null;
  const asin =
    String(formData.get("asin") || "").trim().toUpperCase().slice(0, 10) ||
    null;
  const categoryId = String(formData.get("categoryId") || "").trim();
  const isTrending = formData.get("isTrending") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const isPublished = formData.get("isPublished") === "on";
  const expiresAt = parseOptionalDate(formData.get("expiresAt"));
  const scheduledAt = parseOptionalDate(formData.get("scheduledAt"));

  if (!title || !imageUrl || !affiliateUrl || !categoryId) {
    throw new Error("Title, image, affiliate link, and category are required.");
  }
  if (!/^https?:\/\//i.test(imageUrl) && imageUrl !== PRODUCT_IMAGE_PLACEHOLDER) {
    throw new Error("Image must be a valid http(s) URL or the site placeholder.");
  }
  if (!/^https?:\/\//i.test(affiliateUrl)) {
    throw new Error("Affiliate link must be a valid http(s) URL.");
  }
  if (
    imageUrl !== PRODUCT_IMAGE_PLACEHOLDER &&
    !isAmazonCdnImageUrl(imageUrl)
  ) {
    throw new Error(
      "Product image must be an Amazon CDN URL (e.g. m.media-amazon.com). Do not use stock photos."
    );
  }

  assertAssociatesSafeCopy(
    { title, description, dealPost },
    "Product"
  );

  return {
    title,
    description,
    dealPost,
    imageUrl,
    affiliateUrl,
    couponCode,
    asin: asin && /^[A-Z0-9]{10}$/.test(asin) ? asin : null,
    categoryId,
    isTrending,
    isFeatured,
    isPublished,
    expiresAt,
    scheduledAt:
      !isPublished && scheduledAt && scheduledAt.getTime() > Date.now()
        ? scheduledAt
        : null,
  };
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `deal-${Date.now().toString(36)}`;
  const clash = await prisma.product.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

export async function createProduct(formData: FormData) {
  const admin = await requireProductAccess();

  const limited = await rateLimitDurable(
    `manual-create:${admin.id}`,
    40,
    60 * 60_000
  );
  if (!limited.ok) {
    throw new Error(
      `Create rate limit reached. Try again in ~${limited.retryAfterSec}s.`
    );
  }

  const data = parseProductFields(formData);

  // Amazon links: never trust client tag — use authenticated admin's Tracking ID
  if (!isAmazonProductUrl(data.affiliateUrl) && !data.asin) {
    throw new Error(
      "Paste an Amazon product URL (or ASIN) so we can build your affiliate link."
    );
  }

  const marketplace =
    detectMarketplaceFromInput(data.affiliateUrl) || "US";
  const trackingId = await getAdminTrackingId(admin.id, marketplace);
  if (!trackingId) {
    throw new Error(
      marketplace === "UK"
        ? MISSING_UK_TRACKING_ID_MESSAGE
        : MISSING_TRACKING_ID_MESSAGE
    );
  }

  const normalized = normalizeAdminAffiliateUrl({
    affiliateUrl: data.affiliateUrl,
    asin: data.asin,
    trackingId,
    marketplace,
  });

  // One live deal per ASIN + marketplace across all admins
  const duplicate = await prisma.product.findFirst({
    where: { asin: normalized.asin, marketplace, deletedAt: null },
    select: { title: true },
  });
  if (duplicate) {
    throw new Error(
      `This ${marketplace} product is already on the site: ${duplicate.title}`
    );
  }

  const slug = await uniqueProductSlug(data.title);

  const created = await prisma.product.create({
    data: {
      ...data,
      asin: normalized.asin,
      affiliateUrl: normalized.affiliateUrl,
      couponCode: null,
      slug,
      createdById: admin.id,
      trackingId,
      marketplace,
    },
  });

  if (created.isPublished) {
    after(async () => {
      try {
        await autoPostPublishedDeal(created.id);
      } catch {
        /* never block save */
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const admin = await requireProductAccess();
  const data = parseProductFields(formData);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) throw new Error("Product not found");
  await assertCanManageProduct(admin, product);

  const marketplace =
    detectMarketplaceFromInput(data.affiliateUrl) ||
    parseMarketplace(product.marketplace);
  const trackingId = await trackingIdForProductUpdate(admin, {
    ...product,
    marketplace,
  });

  const normalized = normalizeAdminAffiliateUrl({
    affiliateUrl: data.affiliateUrl,
    asin: data.asin || product.asin,
    trackingId,
    marketplace,
  });

  const slug =
    data.title !== product.title
      ? await uniqueProductSlug(data.title, id)
      : product.slug;

  const wasPublished = product.isPublished;

  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      asin: normalized.asin,
      affiliateUrl: normalized.affiliateUrl,
      couponCode: null,
      slug,
      trackingId,
      marketplace,
    },
  });

  // Newly published → auto social post
  if (data.isPublished && !wasPublished) {
    after(async () => {
      try {
        await autoPostPublishedDeal(id);
      } catch {
        /* ignore */
      }
    });
  }

  revalidatePath("/");
  revalidatePath(`/deal/${slug}`);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  const admin = await requireProductAccess();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Product not found");
  await assertCanManageProduct(admin, product);

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isPublished: false },
  });
  revalidatePath("/");
  revalidatePath("/admin/products");
}

export async function restoreProduct(id: string) {
  const admin = await requireProductAccess();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Product not found");
  await assertCanManageProduct(admin, product);

  await prisma.product.update({
    where: { id },
    data: { deletedAt: null },
  });
  revalidatePath("/");
  revalidatePath("/admin/products");
}

export async function permanentlyDeleteProduct(id: string) {
  const admin = await requireProductAccess();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Product not found");
  await assertCanManageProduct(admin, product);
  if (!product.deletedAt) {
    throw new Error(
      "Archive (soft-delete) the product first, then permanently delete from Archive."
    );
  }

  await prisma.product.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/products");
}

export async function refreshProductFromAmazon(id: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const admin = await requireProductAccess();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) {
    return { ok: false, message: "Product not found." };
  }
  await assertCanManageProduct(admin, product);

  if (!(await isAmazonConfigured(product.marketplace))) {
    return {
      ok: false,
      message: `Amazon Creators API isn't configured for ${product.marketplace}. Add credentials in Admin → Settings → API keys.`,
    };
  }

  const asin = product.asin || extractAsin(product.affiliateUrl);
  if (!asin) {
    return {
      ok: false,
      message: "No ASIN on this product — add one or use an Amazon URL.",
    };
  }

  // Prefer creator's current admin tag for this marketplace, then acting admin
  const market = product.marketplace || "US";
  let partnerTag: string | null = null;
  if (product.createdById) {
    partnerTag = await getAdminTrackingId(product.createdById, market);
  }
  if (!partnerTag) {
    partnerTag = await getAdminTrackingId(admin.id, market);
  }
  if (!partnerTag) {
    return { ok: false, message: MISSING_TRACKING_ID_MESSAGE };
  }

  try {
    const result = await lookupAmazonProduct(asin, partnerTag, market);
    // Preserve curated Gemini title/description — only refresh media + ASIN/link.
    await prisma.product.update({
      where: { id },
      data: {
        imageUrl: result.imageUrl,
        asin: result.asin,
        affiliateUrl: product.affiliateUrl || result.detailPageUrl,
        lastSyncedAt: new Date(),
      },
    });
    revalidatePath("/");
    revalidatePath(`/deal/${product.slug}`);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return {
      ok: true,
      message: "Synced image/ASIN from Amazon (title & description kept).",
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Amazon sync failed.";
    return { ok: false, message };
  }
}

export async function refreshRecentAmazonImages(): Promise<{
  ok: boolean;
  message: string;
  updated: number;
}> {
  const admin = await requireProductAccess();

  if (!(await isAmazonConfigured())) {
    return {
      ok: false,
      message:
        "Amazon Creators API isn't configured. Add credentials in Admin → Settings → API keys.",
      updated: 0,
    };
  }

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(isSuperAdmin(admin) ? {} : { createdById: admin.id }),
      OR: [{ asin: { not: null } }, { affiliateUrl: { contains: "amazon." } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      asin: true,
      affiliateUrl: true,
      imageUrl: true,
      trackingId: true,
      createdById: true,
      marketplace: true,
    },
  });

  let updated = 0;
  for (const p of products) {
    const asin = p.asin || extractAsin(p.affiliateUrl);
    if (!asin) continue;
    const market = p.marketplace || "US";
    let partnerTag: string | null = null;
    if (p.createdById) {
      partnerTag = await getAdminTrackingId(p.createdById, market);
    }
    if (!partnerTag) continue;
    try {
      const result = await lookupAmazonProduct(asin, partnerTag, market);
      await prisma.product.update({
        where: { id: p.id },
        data: {
          imageUrl: result.imageUrl,
          asin: result.asin,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } catch {
      /* skip */
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {
    ok: true,
    message: `Updated ${updated} of ${products.length} recent Amazon deals.`,
    updated,
  };
}

export async function createCategory(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const icon = String(formData.get("icon") || "tag").trim().slice(0, 40);
  const sortOrder = parseInt(String(formData.get("sortOrder") || "0"), 10) || 0;
  const featured = formData.get("featured") === "on";
  const badge = normalizeCategoryBadge(String(formData.get("badge") || ""));
  const description =
    String(formData.get("description") || "").trim().slice(0, 500) || null;
  assertAssociatesSafeCopy({ description }, "Category");
  const imageUrl =
    String(formData.get("imageUrl") || "").trim().slice(0, 2000) || null;
  let parentId = String(formData.get("parentId") || "").trim() || null;

  if (!name) throw new Error("Name required");

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.parentId) {
      throw new Error("Parent must be an existing main category.");
    }
    // Subcategories are not featured banners
  } else {
    parentId = null;
  }

  let slug = slugify(name);
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (parent) slug = slugify(`${parent.slug}-${name}`);
  }
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await prisma.category.create({
    data: {
      name,
      slug,
      icon,
      sortOrder,
      featured: parentId ? false : featured,
      badge,
      description,
      imageUrl,
      parentId,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const icon = String(formData.get("icon") || "tag").trim().slice(0, 40);
  const sortOrder = parseInt(String(formData.get("sortOrder") || "0"), 10) || 0;
  const featured = formData.get("featured") === "on";
  const badge = normalizeCategoryBadge(String(formData.get("badge") || ""));
  const description =
    String(formData.get("description") || "").trim().slice(0, 500) || null;
  assertAssociatesSafeCopy({ description }, "Category");
  const imageUrl =
    String(formData.get("imageUrl") || "").trim().slice(0, 2000) || null;
  let parentId = String(formData.get("parentId") || "").trim() || null;

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw new Error("Not found");

  if (parentId === id) throw new Error("Category cannot be its own parent.");
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.parentId) {
      throw new Error("Parent must be an existing main category.");
    }
  } else {
    parentId = null;
  }

  let slug = cat.slug;
  if (name !== cat.name || parentId !== cat.parentId) {
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      slug = slugify(`${parent?.slug || "cat"}-${name}`);
    } else {
      slug = slugify(name);
    }
    const clash = await prisma.category.findFirst({
      where: { slug, NOT: { id } },
    });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  }

  await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      icon,
      sortOrder,
      featured: parentId ? false : featured,
      badge,
      description,
      imageUrl,
      parentId,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
  await requireSuperAdmin();

  const cat = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
      children: { select: { id: true, _count: { select: { products: true } } } },
    },
  });
  if (!cat) throw new Error("Category not found.");

  if (cat._count.products > 0) {
    throw new Error(
      `Cannot delete “${cat.name}” — it still has ${cat._count.products} product(s). Move or delete those deals first.`
    );
  }

  const childWithProducts = cat.children.find((c) => c._count.products > 0);
  if (childWithProducts || cat._count.children > 0) {
    const childProductTotal = cat.children.reduce(
      (n, c) => n + c._count.products,
      0
    );
    if (childProductTotal > 0) {
      throw new Error(
        `Cannot delete “${cat.name}” — subcategories still have ${childProductTotal} product(s). Clear those first.`
      );
    }
    throw new Error(
      `Cannot delete “${cat.name}” while it has ${cat._count.children} subcategory(ies). Delete empty subcategories first.`
    );
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/categories");
}

export async function createAdminUser(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (!name) throw new Error("Name is required.");

  const email = emailSchema.parse(
    String(formData.get("email") || "")
      .toLowerCase()
      .trim()
  );
  const password = passwordSchema.parse(String(formData.get("password") || ""));
  const canManageProducts = formData.get("canManageProducts") === "on";

  const rawTag = String(formData.get("amazonTrackingId") || "").trim();
  const amazonTrackingId =
    rawTag === "" ? null : normalizeTrackingId(rawTag);
  if (rawTag && !amazonTrackingId) {
    throw new Error(
      "Invalid Amazon Tracking ID. Use letters, numbers, and hyphens (e.g. admin2-20)."
    );
  }

  const rawTagUk = String(formData.get("amazonTrackingIdUk") || "").trim();
  const amazonTrackingIdUk =
    rawTagUk === "" ? null : normalizeTrackingId(rawTagUk);
  if (rawTagUk && !amazonTrackingIdUk) {
    throw new Error(
      "Invalid UK Amazon Tracking ID. Use letters, numbers, and hyphens (e.g. admin2-21)."
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) throw new Error("An admin with that email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      canManageProducts,
      amazonTrackingId,
      amazonTrackingIdUk,
    },
  });

  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}

export async function updateAdminUser(id: string, formData: FormData) {
  const current = await requireSuperAdmin();

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) throw new Error("Admin not found");

  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (!name) throw new Error("Name is required.");

  const newPassword = String(formData.get("password") || "");

  const rawTag = String(formData.get("amazonTrackingId") || "").trim();
  const amazonTrackingId =
    rawTag === "" ? null : normalizeTrackingId(rawTag);
  if (rawTag && !amazonTrackingId) {
    throw new Error(
      "Invalid Amazon Tracking ID. Use letters, numbers, and hyphens (e.g. admin2-20)."
    );
  }

  const rawTagUk = String(formData.get("amazonTrackingIdUk") || "").trim();
  const amazonTrackingIdUk =
    rawTagUk === "" ? null : normalizeTrackingId(rawTagUk);
  if (rawTagUk && !amazonTrackingIdUk) {
    throw new Error(
      "Invalid UK Amazon Tracking ID. Use letters, numbers, and hyphens (e.g. admin2-21)."
    );
  }

  if (id === current.id) {
    const data: {
      name: string;
      passwordHash?: string;
      amazonTrackingId: string | null;
      amazonTrackingIdUk: string | null;
    } = { name, amazonTrackingId, amazonTrackingIdUk };
    if (newPassword) {
      data.passwordHash = await bcrypt.hash(
        passwordSchema.parse(newPassword),
        12
      );
    }
    await prisma.adminUser.update({ where: { id }, data });
    revalidatePath("/admin/admins");
    revalidatePath("/admin/products");
    revalidatePath("/admin/settings");
    redirect("/admin/admins");
  }

  if (target.role === "SUPER_ADMIN") {
    throw new Error("Cannot modify another Super Admin.");
  }

  const canManageProducts = formData.get("canManageProducts") === "on";
  const isActive = formData.get("isActive") === "on";

  const data: {
    name: string;
    canManageProducts: boolean;
    isActive: boolean;
    amazonTrackingId: string | null;
    amazonTrackingIdUk: string | null;
    passwordHash?: string;
  } = {
    name,
    canManageProducts,
    isActive,
    amazonTrackingId,
    amazonTrackingIdUk,
  };

  if (newPassword) {
    data.passwordHash = await bcrypt.hash(
      passwordSchema.parse(newPassword),
      12
    );
  }

  await prisma.adminUser.update({ where: { id }, data });
  revalidatePath("/admin/admins");
  revalidatePath("/admin/products");
  redirect("/admin/admins");
}

export async function revokeAdminAccess(id: string) {
  const current = await requireSuperAdmin();
  if (id === current.id) throw new Error("Cannot revoke your own access.");

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) throw new Error("Admin not found");
  if (target.role === "SUPER_ADMIN") {
    throw new Error("Cannot revoke a Super Admin.");
  }

  await prisma.adminUser.update({
    where: { id },
    data: { isActive: false, canManageProducts: false },
  });

  revalidatePath("/admin/admins");
}

export async function deleteAdminUser(id: string) {
  const current = await requireSuperAdmin();
  if (id === current.id) throw new Error("Cannot delete yourself.");

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) throw new Error("Admin not found");
  if (target.role === "SUPER_ADMIN") {
    throw new Error("Cannot delete a Super Admin.");
  }

  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/admins");
}

export async function assertSuperAdminPage() {
  const admin = await requireAdminSession();
  if (!isSuperAdmin(admin)) redirect("/admin");
  return admin;
}

/** Bulk-publish selected drafts (or clear schedule). */
export async function bulkPublishProducts(ids: string[]) {
  const admin = await requireProductAccess();
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    40
  );
  if (!unique.length) throw new Error("No products selected.");

  const products = await prisma.product.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true, createdById: true, isPublished: true },
  });

  const publishedIds: string[] = [];
  for (const p of products) {
    await assertCanManageProduct(admin, p);
    if (p.isPublished) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { isPublished: true, scheduledAt: null },
    });
    publishedIds.push(p.id);
  }

  after(async () => {
    for (const id of publishedIds) {
      try {
        await autoPostPublishedDeal(id);
      } catch {
        /* ignore */
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/insights");
  return { ok: true as const, count: publishedIds.length };
}

export async function publishDueScheduledNow() {
  const admin = await requireProductAccess();
  const now = new Date();
  const due = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isPublished: false,
      scheduledAt: { lte: now },
    },
    take: 30,
    select: { id: true, createdById: true },
  });
  let count = 0;
  for (const p of due) {
    await assertCanManageProduct(admin, p);
    await prisma.product.update({
      where: { id: p.id },
      data: { isPublished: true, scheduledAt: null },
    });
    count++;
    after(async () => {
      try {
        await autoPostPublishedDeal(p.id);
      } catch {
        /* ignore */
      }
    });
  }
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/insights");
  return { ok: true as const, count };
}

export async function runLinkHealthCheck(limit = 20) {
  const admin = await requireProductAccess();
  const { checkProductLinks } = await import("@/lib/link-check");
  const results = await checkProductLinks(limit, {
    ownerAdminId: isSuperAdmin(admin) ? undefined : admin.id,
  });
  revalidatePath("/admin/insights");
  revalidatePath("/admin/products");
  return { ok: true as const, results };
}
