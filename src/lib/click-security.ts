import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Obvious non-human / scraper user agents — do not inflate click analytics. */
const BOT_UA =
  /\b(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegramBot|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|curl|wget|python-requests|httpclient|scrapy|headlesschrome|phantomjs|selenium)\b/i;

export type DeviceClass = "mobile" | "tablet" | "desktop" | "unknown";

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || "").trim();
  if (!ua || ua.length < 12) return true;
  if (BOT_UA.test(ua)) return true;
  return false;
}

export function classifyDevice(userAgent: string | null | undefined): DeviceClass {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "unknown";
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "unknown";
}

/**
 * Store only a safe, short referer — same-origin path preferred.
 * Never keep credentials, fragments, or huge query strings.
 */
export function sanitizeClickReferer(
  raw: string | null | undefined,
  siteOrigin: string
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 500);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const origin = siteOrigin.replace(/\/$/, "");
    let site: URL;
    try {
      site = new URL(origin);
    } catch {
      return null;
    }

    // Same site → path only (no query — may contain tokens / emails)
    if (url.origin === site.origin) {
      const path = url.pathname || "/";
      if (path.startsWith("/go/")) return null;
      if (path.startsWith("/admin") || path.startsWith("/api")) return null;
      return path.length > 120 ? `${path.slice(0, 117)}…` : path;
    }

    // External → hostname only (enough for “came from X”, less PII)
    const host = url.hostname.replace(/^www\./i, "").slice(0, 80);
    return host ? `external:${host}` : null;
  } catch {
    return null;
  }
}

export function sanitizeUserAgent(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const ua = raw.trim().slice(0, 300);
  return ua || null;
}

/**
 * Decide whether this hit should be written to ClickEvent.
 * Always allow the Amazon redirect; only gate analytics writes.
 *
 * - Skip bots / empty UA
 * - Per-IP flood cap (redirect still happens)
 * - Soft per-IP+product dedupe window (refresh spam)
 */
export function shouldRecordClick(
  req: Request,
  productId: string
): { record: boolean; reason?: string } {
  const ua = req.headers.get("user-agent");
  if (isLikelyBot(ua)) {
    return { record: false, reason: "bot" };
  }

  const ip = clientIp(req);
  // Burst flood: ~45 recorded clicks / minute / IP
  const burst = rateLimit(`go-click:${ip}`, 45, 60_000);
  if (!burst.ok) {
    return { record: false, reason: "rate_limit" };
  }

  // Same product hammering: 8 records / 5 min / IP+product
  const perProduct = rateLimit(`go-click:${ip}:${productId}`, 8, 5 * 60_000);
  if (!perProduct.ok) {
    return { record: false, reason: "dedupe" };
  }

  return { record: true };
}
