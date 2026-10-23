/**
 * Campaign / channel tags for /go links and social posts.
 * Stored on ClickEvent.campaign — never trust arbitrary long strings.
 */

const ALLOWED = new Set([
  "fb",
  "facebook",
  "threads",
  "ig",
  "instagram",
  "tg",
  "telegram",
  "pin",
  "pinterest",
  "x",
  "twitter",
  "email",
  "bio",
  "story",
  "ads",
  "organic",
]);

export function normalizeCampaign(
  raw: string | null | undefined
): string | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 32);
  if (!v) return null;
  if (!/^[a-z0-9_-]+$/.test(v)) return null;
  if (ALLOWED.has(v)) return v;
  // Allow short custom codes (a-z0-9) for experiments
  if (/^[a-z0-9]{2,16}$/.test(v)) return v;
  return null;
}

/** Map social platform → default campaign code for tracked go links. */
export function campaignForPlatform(
  platform: string
): string {
  switch (platform) {
    case "facebook":
      return "fb";
    case "threads":
      return "threads";
    case "instagram":
      return "ig";
    case "telegram":
      return "tg";
    case "pinterest":
      return "pin";
    case "x":
      return "x";
    default:
      return "organic";
  }
}

/**
 * Build a tracked site go URL: /go/{slug}?src=fb
 * Prefer this in social captions over raw Amazon links when we want
 * first-party analytics (Amazon tag still fires after redirect).
 */
export function buildTrackedGoUrl(
  siteUrl: string,
  slug: string,
  campaign?: string | null
): string {
  const base = siteUrl.replace(/\/$/, "");
  const src = normalizeCampaign(campaign);
  const url = `${base}/go/${encodeURIComponent(slug)}`;
  return src ? `${url}?src=${encodeURIComponent(src)}` : url;
}
