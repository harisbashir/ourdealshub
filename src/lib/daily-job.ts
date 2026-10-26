import { recordSystemEvent } from "./system-events";
import { prisma } from "./prisma";
import {
  formatDigestMessage,
  getOpsInsights,
} from "./ops-insights";
import { autoPostPublishedDeal } from "./social-publish";
import { pruneOldClickEvents } from "./click-retention";
import { openSecret } from "./secret-box";


/** Shared by the protected HTTP endpoint and the managed-hosting cron script. */
export async function runDailyJob(opts?: { revalidate?: boolean }) {
  const now = new Date();
  const due = await prisma.product.findMany({
    where: {
      isDemo: false,
      deletedAt: null,
      isPublished: false,
      scheduledAt: { lte: now },
    },
    take: 30,
    select: { id: true },
  });

  let publishedCount = 0;
  for (const p of due) {
    await prisma.product.update({
      where: { id: p.id },
      data: { isPublished: true, scheduledAt: null },
    });
    publishedCount += 1;
    try {
      await autoPostPublishedDeal(p.id);
    } catch {
      /* continue */
    }
  }

  // Refresh Amazon data via the Creators API (24h caching limit, removed items)
  let sync = { refreshed: 0, flagged: 0, unpublished: 0, skipped: 0, errors: 0 };
  try {
    const { syncAmazonProducts } = await import("./amazon-sync");
    sync = await syncAmazonProducts(150, opts);
  } catch {
    /* non-fatal */
  }

  // Re-check affiliate links not covered by the API refresh (untagged probe)
  let linksChecked = 0;
  let linksBroken = 0;
  try {
    const { checkProductLinks } = await import("./link-check");
    const results = await checkProductLinks(20);
    linksChecked = results.length;
    linksBroken = results.filter((r) => r.status === "broken").length;
  } catch {
    /* non-fatal */
  }

  const insights = await getOpsInsights(7);
  const message = formatDigestMessage(insights);

  let telegramOk = false;
  const tg = await prisma.socialConnection.findUnique({
    where: { platform: "telegram" },
  });
  if (tg?.isActive && tg.accessToken && tg.pageId) {
    try {
      const token = openSecret(tg.accessToken);
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tg.pageId,
            text: message,
          }),
          cache: "no-store",
        }
      );
      const data = (await res.json()) as { ok?: boolean };
      telegramOk = Boolean(data.ok);
    } catch {
      telegramOk = false;
    }
  }

  const clicksPruned = await pruneOldClickEvents();

  const summary = `published=${publishedCount}; amazonRefreshed=${sync.refreshed}; amazonFlagged=${sync.flagged}; amazonUnpublished=${sync.unpublished}; linksChecked=${linksChecked}; linksBroken=${linksBroken}; telegramOk=${telegramOk}; clicksPruned=${clicksPruned}`;

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      cronLastRunAt: new Date(),
      cronLastOk: true,
      cronLastSummary: summary.slice(0, 500),
    },
    update: {
      cronLastRunAt: new Date(),
      cronLastOk: true,
      cronLastSummary: summary.slice(0, 500),
    },
  });

  await recordSystemEvent({ category: "operations", title: sync.errors || linksBroken ? "Daily maintenance completed with warnings" : "Daily maintenance completed", level: sync.errors || linksBroken ? "warning" : "info", detail: summary, adminPath: "/admin/insights" });

  return {
    ok: true,
    publishedCount,
    amazon: sync,
    telegramOk,
    clicksPruned,
    linksChecked,
    linksBroken,
  };
}
