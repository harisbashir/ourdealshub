import { prisma } from "@/lib/prisma";
import { rateLimit, type RateLimitResult } from "@/lib/rate-limit";

/**
 * Shared rate limit across processes (Postgres).
 * Falls back to in-memory if the DB is briefly unavailable.
 */
export async function rateLimitDurable(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.rateBucket.findUnique({ where: { key } });
      const windowStartMs = row?.windowStart.getTime() ?? 0;
      const expired = !row || now - windowStartMs >= windowMs;

      if (expired) {
        await tx.rateBucket.upsert({
          where: { key },
          create: {
            key,
            count: 1,
            windowStart: new Date(now),
          },
          update: {
            count: 1,
            windowStart: new Date(now),
          },
        });
        return {
          ok: true,
          remaining: Math.max(0, limit - 1),
          retryAfterSec: 0,
        };
      }

      if (row.count >= limit) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((windowMs - (now - windowStartMs)) / 1000)
        );
        return { ok: false, remaining: 0, retryAfterSec };
      }

      await tx.rateBucket.update({
        where: { key },
        data: { count: { increment: 1 } },
      });

      return {
        ok: true,
        remaining: Math.max(0, limit - row.count - 1),
        retryAfterSec: 0,
      };
    });
  } catch {
    // Fail closed for auth-like keys when possible via memory; still better than open.
    return rateLimit(key, limit, windowMs);
  }
}
