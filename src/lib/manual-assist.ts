"use server";

import { requireProductAccess } from "@/lib/admin-auth";
import { getAdminTrackingId } from "@/lib/admin-tracking";
import {
  extractAsin,
  getEnvPartnerTagFallback,
  isAmazonConfigured,
  lookupAmazonProduct,
} from "@/lib/amazon";
import { generateProductContent, isGeminiConfigured } from "@/lib/gemini";
import { getSiteSettings } from "@/lib/settings";
import { normalizeTrackingId } from "@/lib/tracking";
import { rateLimitDurable } from "@/lib/rate-limit-durable";

export type ManualFetchResult =
  | {
      ok: true;
      asin: string;
      title: string;
      description: string;
      imageUrl: string;
    }
  | { ok: false; error: string };

export type ManualGeminiResult =
  | { ok: true; title: string; dealPost: string }
  | { ok: false; error: string };

/**
 * Partner tag only for PA-API auth — never replaces the admin's pasted affiliate URL.
 * Prefer tag from the pasted link, then admin DB, then env fallback.
 */
function partnerTagForLookup(
  affiliateUrl: string,
  adminTrackingId: string | null
): string | null {
  try {
    const fromUrl = new URL(affiliateUrl).searchParams.get("tag");
    const normalized = normalizeTrackingId(fromUrl);
    if (normalized) return normalized;
  } catch {
    /* ignore */
  }
  return (
    normalizeTrackingId(adminTrackingId) ||
    normalizeTrackingId(getEnvPartnerTagFallback())
  );
}

/**
 * Pull title / description / Amazon CDN image from an affiliate URL or ASIN.
 * Does not change the affiliate link the admin pasted.
 */
export async function fetchProductDetailsFromLink(
  input: string
): Promise<ManualFetchResult> {
  const admin = await requireProductAccess();
  const limited = await rateLimitDurable(
    `manual-fetch:${admin.id}`,
    30,
    60 * 60_000
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: "Too many lookups. Try again in a few minutes.",
    };
  }

  if (!isAmazonConfigured()) {
    return {
      ok: false,
      error: "Amazon API is not configured on the server.",
    };
  }

  const raw = input.trim();
  if (!raw) {
    return { ok: false, error: "Paste an affiliate link or ASIN first." };
  }

  const asin = extractAsin(raw);
  if (!asin) {
    return {
      ok: false,
      error: "Could not find an ASIN in that link.",
    };
  }

  const adminTag = await getAdminTrackingId(admin.id);
  const partnerTag = partnerTagForLookup(raw, adminTag);
  if (!partnerTag) {
    return {
      ok: false,
      error:
        "Need a partner tag for Amazon lookup. Include ?tag=yourtag-20 in your affiliate link, or ask the Super Admin to set API credentials / Tracking ID.",
    };
  }

  try {
    const product = await lookupAmazonProduct(asin, partnerTag);
    return {
      ok: true,
      asin: product.asin,
      title: product.title,
      description: product.description,
      imageUrl: product.imageUrl,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Amazon lookup failed.",
    };
  }
}

/** Generate deal post from title + description via Gemini (manual form). */
export async function generateDealPostFromManual(opts: {
  title: string;
  description: string;
}): Promise<ManualGeminiResult> {
  const admin = await requireProductAccess();
  const limited = await rateLimitDurable(
    `manual-gemini:${admin.id}`,
    40,
    60 * 60_000
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: "Too many Gemini requests. Try again later.",
    };
  }

  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error: "Gemini API is not configured on the server.",
    };
  }

  const title = opts.title.trim();
  const description = opts.description.trim();
  if (!title) {
    return { ok: false, error: "Add a product title first." };
  }
  if (!description) {
    return {
      ok: false,
      error: "Add a product description first (or fetch it from the affiliate link).",
    };
  }

  try {
    const settings = await getSiteSettings();
    const generated = await generateProductContent({
      title,
      description,
      promptTemplate: settings.geminiPromptTemplate,
    });
    return {
      ok: true,
      title: generated.title,
      dealPost: generated.description,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gemini generation failed.",
    };
  }
}
