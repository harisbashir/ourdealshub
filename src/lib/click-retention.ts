import { prisma } from "@/lib/prisma";

/** Keep click analytics for this many days (sanitized UA/referer only — no IPs). */
export const CLICK_RETENTION_DAYS = 90;

async function pruneOlderThanRetention(): Promise<number> {
  const cutoff = new Date(
    Date.now() - CLICK_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const result = await prisma.clickEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

/**
 * Best-effort prune of old click rows. Safe to call from request `after()`.
 * Throttled so it does not run on every click.
 */
export async function maybePruneOldClickEvents(): Promise<void> {
  // ~2% of clicks trigger a prune (cheap on small sites)
  if (Math.random() > 0.02) return;

  try {
    await pruneOlderThanRetention();
  } catch {
    /* never break redirects */
  }
}

/** Always prune (daily cron). Returns deleted row count. */
export async function pruneOldClickEvents(): Promise<number> {
  try {
    return await pruneOlderThanRetention();
  } catch {
    return 0;
  }
}
