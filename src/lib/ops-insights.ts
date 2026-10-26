import { prisma } from "@/lib/prisma";

export type InsightsBundle = {
  days: number;
  topProducts: {
    id: string;
    title: string;
    slug: string;
    count: number;
    marketplace: string;
  }[];
  clicksByMarketplace: { marketplace: string; count: number }[];
  newDealsByMarketplace: { marketplace: string; count: number }[];
  deadProducts: {
    id: string;
    title: string;
    slug: string;
    createdAt: string;
  }[];
  brokenLinks: { id: string; title: string; slug: string; status: string }[];
  scheduled: { id: string; title: string; slug: string; scheduledAt: string }[];
  byCampaign: { campaign: string; count: number }[];
  failedPosts: {
    id: string;
    productTitle: string;
    platform: string;
    error: string;
    createdAt: string;
  }[];
  failedPostCount: number;
  tokensExpiring: {
    platform: string;
    pageName: string;
    tokenExpiresAt: string;
  }[];
};

export async function getOpsInsights(days = 7): Promise<InsightsBundle> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [
    topGroups,
    deadProducts,
    brokenLinks,
    scheduled,
    campaignRaw,
    failedPosts,
    failedPostCount,
    tokensExpiring,
    clicksByMarketRaw,
    newDealsByMarketRaw,
  ] = await Promise.all([
    prisma.clickEvent.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.product.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        clickCount: 0,
        createdAt: { lte: since },
      },
      orderBy: { createdAt: "asc" },
      take: 12,
      select: { id: true, title: true, slug: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, linkStatus: "broken" },
      take: 20,
      select: { id: true, title: true, slug: true, linkStatus: true },
    }),
    prisma.product.findMany({
      where: {
        deletedAt: null,
        isPublished: false,
        scheduledAt: { not: null },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      select: { id: true, title: true, slug: true, scheduledAt: true },
    }),
    prisma.$queryRaw<Array<{ campaign: string | null; count: bigint }>>`
      SELECT COALESCE(campaign, 'direct') AS campaign, COUNT(*) AS count
      FROM \`ClickEvent\`
      WHERE \`createdAt\` >= ${since}
      GROUP BY COALESCE(campaign, 'direct')
      ORDER BY count DESC
      LIMIT 12
    `,
    prisma.socialPostLog.findMany({
      where: { status: "error", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { product: { select: { title: true } } },
    }),
    prisma.socialPostLog.count({
      where: { status: "error", createdAt: { gte: since } },
    }),
    prisma.socialConnection.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: { not: null, lte: weekAhead },
      },
      select: {
        platform: true,
        pageName: true,
        tokenExpiresAt: true,
      },
    }),
    prisma.$queryRaw<Array<{ marketplace: string; count: bigint }>>`
      SELECT COALESCE(p.marketplace, 'US') AS marketplace, COUNT(ce.id) AS count
      FROM \`ClickEvent\` ce
      INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
      WHERE ce.\`createdAt\` >= ${since}
      GROUP BY COALESCE(p.marketplace, 'US')
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ marketplace: string; count: bigint }>>`
      SELECT COALESCE(marketplace, 'US') AS marketplace, COUNT(*) AS count
      FROM \`Product\`
      WHERE \`deletedAt\` IS NULL AND \`createdAt\` >= ${since}
      GROUP BY COALESCE(marketplace, 'US')
      ORDER BY count DESC
    `,
  ]);

  const ids = topGroups.map((g) => g.productId);
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, slug: true, marketplace: true },
      })
    : [];
  const map = new Map(products.map((p) => [p.id, p]));

  return {
    days,
    topProducts: topGroups
      .map((g) => {
        const p = map.get(g.productId);
        if (!p) return null;
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          marketplace: p.marketplace || "US",
          count: g._count.id,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
    clicksByMarketplace: clicksByMarketRaw.map((r) => ({
      marketplace: r.marketplace || "US",
      count: Number(r.count),
    })),
    newDealsByMarketplace: newDealsByMarketRaw.map((r) => ({
      marketplace: r.marketplace || "US",
      count: Number(r.count),
    })),
    deadProducts: deadProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      createdAt: p.createdAt.toISOString(),
    })),
    brokenLinks: brokenLinks.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.linkStatus,
    })),
    scheduled: scheduled
      .filter((p) => p.scheduledAt)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        scheduledAt: p.scheduledAt!.toISOString(),
      })),
    byCampaign: campaignRaw.map((r) => ({
      campaign: r.campaign || "direct",
      count: Number(r.count),
    })),
    failedPosts: failedPosts.map((p) => ({
      id: p.id,
      productTitle: p.product.title,
      platform: p.platform,
      error: p.error || "Unknown error",
      createdAt: p.createdAt.toISOString(),
    })),
    failedPostCount,
    tokensExpiring: tokensExpiring
      .filter((t) => t.tokenExpiresAt)
      .map((t) => ({
        platform: t.platform,
        pageName: t.pageName || t.platform,
        tokenExpiresAt: t.tokenExpiresAt!.toISOString(),
      })),
  };
}

export function formatDigestMessage(insights: InsightsBundle): string {
  const lines: string[] = [
    `OurDealsHub digest — last ${insights.days}d`,
    "",
    "Clicks by store:",
  ];
  if (insights.clicksByMarketplace.length === 0) {
    lines.push("· none yet");
  } else {
    for (const m of insights.clicksByMarketplace) {
      lines.push(`· ${m.marketplace}: ${m.count}`);
    }
  }
  lines.push("");
  lines.push("New deals by store:");
  if (insights.newDealsByMarketplace.length === 0) {
    lines.push("· none");
  } else {
    for (const m of insights.newDealsByMarketplace) {
      lines.push(`· ${m.marketplace}: ${m.count}`);
    }
  }
  lines.push("");
  lines.push("Top clicks:");
  if (insights.topProducts.length === 0) {
    lines.push("· none yet");
  } else {
    for (const p of insights.topProducts.slice(0, 5)) {
      lines.push(
        `· [${p.marketplace}] ${p.count} — ${p.title.slice(0, 55)}`
      );
    }
  }
  lines.push("");
  lines.push(
    `Dead deals (0 clicks, older than ${insights.days}d): ${insights.deadProducts.length}`
  );
  lines.push(`Broken links flagged: ${insights.brokenLinks.length}`);
  if (insights.brokenLinks.length) {
    for (const b of insights.brokenLinks.slice(0, 5)) {
      lines.push(`· ${b.title.slice(0, 50)}`);
    }
  }
  lines.push(`Scheduled drafts: ${insights.scheduled.length}`);
  lines.push(`Failed social posts: ${insights.failedPostCount}`);
  if (insights.tokensExpiring.length) {
    lines.push("");
    lines.push("Tokens expiring soon:");
    for (const t of insights.tokensExpiring) {
      lines.push(
        `· ${t.platform}: ${new Date(t.tokenExpiresAt).toLocaleDateString()}`
      );
    }
  }
  if (insights.failedPosts.length) {
    lines.push("");
    lines.push("Recent failures:");
    for (const f of insights.failedPosts.slice(0, 5)) {
      lines.push(
        `· ${f.platform}: ${f.productTitle.slice(0, 40)} — ${f.error.slice(0, 60)}`
      );
    }
  }
  if (insights.byCampaign.length) {
    lines.push("");
    lines.push("By campaign:");
    for (const c of insights.byCampaign.slice(0, 6)) {
      lines.push(`· ${c.campaign}: ${c.count}`);
    }
  }
  return lines.join("\n");
}
