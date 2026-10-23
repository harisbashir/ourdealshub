/**
 * In-memory sliding-window rate limiter (single Node process).
 * For login / Amazon / Gemini / import use `rateLimitDurable` (Postgres)
 * so limits still work across serverless instances.
 * Keep this helper for high-volume, low-risk paths (e.g. click analytics).
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

function pruneStaleBuckets(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 60 * 60_000);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
  // Hard cap: drop oldest arbitrary keys if still oversized
  if (buckets.size > MAX_KEYS) {
    const overflow = buckets.size - MAX_KEYS;
    let i = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++i >= overflow) break;
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  pruneStaleBuckets(now);

  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0] || now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000)
    );
    return { ok: false, remaining: 0, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}

/**
 * Best-effort client IP from proxy headers.
 * Prefer x-real-ip (set by the edge). For X-Forwarded-For, use the
 * rightmost hop — clients can spoof left-side values; proxies append.
 */
export function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return "unknown";
}
