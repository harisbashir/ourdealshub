import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getEnvPartnerTagFallback,
  isAmazonConfigured,
  refreshAmazonItems,
} from "@/lib/amazon";
import { getAdminTrackingId } from "@/lib/admin-tracking";
import { normalizeTrackingId } from "@/lib/tracking";
import { shouldUnpublishAfterCheck } from "@/lib/link-check";
import type { MarketplaceCode } from "@/lib/marketplace";

export type AmazonSyncSummary = {
  refreshed: number;
  flagged: number;
  unpublished: number;
  skipped: number;
  errors: number;
};

/**
 * Daily refresh of Amazon data via the Creators API (run from the cron).
 *
 * Why: the Associates license lets sites cache non-image product data for at
 * most 24 hours and requires removing items that are no longer available
 * (IP License §2(h), Participation Requirements §6(c)). Image URLs are
 * refreshed too, so we never rely on a stale Amazon CDN link.
 *
 * Curated titles / write-ups are kept — only Amazon-sourced fields change.
 */
export async function syncAmazonProducts(
  limitPerMarket = 150
): Promise<AmazonSyncSummary> {
  const summary: AmazonSyncSummary = {
    refreshed: 0,
    flagged: 0,
    unpublished: 0,
    skipped: 0,
    errors: 0,
  };
  const markets: MarketplaceCode[] = ["US", "UK"];
  let changedPublic = false;

  for (const market of markets) {
    if (!(await isAmazonConfigured(market))) continue;

    const products = await prisma.product.findMany({
      where: { deletedAt: null, asin: { not: null }, marketplace: market },
      orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }],
      take: limitPerMarket,
      select: {
        id: true,
        asin: true,
        slug: true,
        createdById: true,
        linkStatus: true,
        isPublished: true,
      },
    });

    // GetItems needs a partner tag from the same store — group by owner tag
    const byTag = new Map<string, typeof products>();
    for (const p of products) {
      const tag =
        (p.createdById && (await getAdminTrackingId(p.createdById, market))) ||
        normalizeTrackingId(getEnvPartnerTagFallback());
      if (!tag) {
        summary.skipped++;
        continue;
      }
      byTag.set(tag, [...(byTag.get(tag) || []), p]);
    }

    for (const [tag, group] of byTag) {
      let results;
      try {
        results = await refreshAmazonItems(
          group.map((p) => p.asin as string),
          tag,
          market
        );
      } catch {
        summary.errors += group.length;
        continue;
      }
      const byAsin = new Map(results.map((r) => [r.asin, r]));
      const now = new Date();

      for (const p of group) {
        const r = byAsin.get(p.asin as string);
        if (!r) continue;
        if (r.ok) {
          await prisma.product.update({
            where: { id: p.id },
            data: {
              imageUrl: r.data.imageUrl,
              lastSyncedAt: now,
              linkStatus: "ok",
              linkCheckedAt: now,
            },
          });
          summary.refreshed++;
          changedPublic ||= p.isPublished;
        } else if (r.unavailable) {
          const unpublish = shouldUnpublishAfterCheck(p.linkStatus, {
            status: "broken",
            detail: r.error,
          });
          await prisma.product.update({
            where: { id: p.id },
            data: {
              linkStatus: "broken",
              linkCheckedAt: now,
              lastSyncedAt: now,
              ...(unpublish ? { isPublished: false, scheduledAt: null } : {}),
            },
          });
          if (unpublish) {
            summary.unpublished++;
            changedPublic ||= p.isPublished;
          } else {
            summary.flagged++;
          }
        } else {
          summary.errors++;
        }
      }
    }
  }

  if (changedPublic) revalidatePath("/", "layout");
  return summary;
}
