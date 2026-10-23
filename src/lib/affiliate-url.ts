import { extractAsin, buildAffiliateUrl } from "@/lib/amazon";
import {
  isAmazonProductHost,
  isAmazonRedirectHost,
} from "@/lib/amazon-hosts";

const AMAZON_IMAGE_HOST =
  /(?:^|\.)(?:media-amazon\.com|ssl-images-amazon\.com|images-na\.ssl-images-amazon\.com|images-eu\.ssl-images-amazon\.com)$/i;

/** Generic non-product placeholder (not an unrelated stock photo). */
export const PRODUCT_IMAGE_PLACEHOLDER = "/product-placeholder.svg";

export function isAmazonProductUrl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname;
    return isAmazonProductHost(host);
  } catch {
    return false;
  }
}

export function isAmazonCdnImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (!/^https?:$/i.test(url.protocol)) return false;
    const host = url.hostname.replace(/^www\./i, "");
    return AMAZON_IMAGE_HOST.test(host);
  } catch {
    return false;
  }
}

/**
 * Normalize an Amazon product URL using the authenticated admin's tracking ID.
 * Never trusts a tag from the client.
 */
export function normalizeAdminAffiliateUrl(opts: {
  affiliateUrl: string;
  asin: string | null;
  trackingId: string;
  marketplace?: string;
}): { asin: string; affiliateUrl: string } {
  const asin =
    opts.asin ||
    extractAsin(opts.affiliateUrl) ||
    null;
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) {
    throw new Error(
      "Amazon ASIN is required. Paste a product URL that includes the ASIN, or enter the ASIN."
    );
  }
  const normalizedAsin = asin.toUpperCase();
  return {
    asin: normalizedAsin,
    affiliateUrl: buildAffiliateUrl(
      opts.affiliateUrl,
      opts.trackingId,
      normalizedAsin,
      opts.marketplace || "US"
    ),
  };
}

/**
 * Only allow http(s) redirects to real Amazon hosts for /go.
 * Prevents open redirects to lookalike domains.
 */
export function isSafeAffiliateRedirectUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return isAmazonRedirectHost(url.hostname);
  } catch {
    return false;
  }
}
