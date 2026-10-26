import { prisma } from "@/lib/prisma";
import { classifyDevice, type DeviceClass } from "@/lib/click-security";

/** Preset chips; custom ranges use any integer 1–90. */
export type AnalyticsRange = 7 | 14 | 30;

export type DayBucket = { day: string; count: number };
export type NamedCount = { id: string; name: string; count: number };
export type DeviceCount = { id: DeviceClass; name: string; count: number };
export type ProductClickRow = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  categoryName: string;
  adminName: string;
  marketplace: string;
  count: number;
};
export type LandingRow = { path: string; count: number };

/** Clamp day windows used by analytics (presets + custom). */
export function clampAnalyticsDays(raw: number | string | undefined | null): number {
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return 14;
  return Math.min(90, Math.max(1, Math.round(n)));
}

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

/** Normalize stored referer labels for "top landing pages". */
export function landingPathFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  const raw = referer.trim();
  if (!raw) return null;

  // Already sanitized by click-security (path or external:host)
  if (raw.startsWith("external:")) return raw.slice(0, 100);
  if (raw.startsWith("/")) {
    if (raw.startsWith("/go/")) return null;
    if (raw.startsWith("/admin") || raw.startsWith("/api")) return null;
    return raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
  }

  try {
    const url = new URL(raw);
    const origin = siteOrigin();
    if (url.origin !== new URL(origin).origin) {
      return `external:${url.hostname.replace(/^www\./i, "")}`;
    }
    const path = url.pathname || "/";
    if (path.startsWith("/go/")) return null;
    return path.length > 80 ? `${path.slice(0, 77)}…` : path;
  } catch {
    return null;
  }
}

/**
 * Click analytics. Pass ownerAdminId to limit a staff admin to their own deals.
 * Super Admin should omit ownerAdminId for site-wide stats.
 */
export async function getClickAnalytics(
  daysInput: number = 14,
  opts?: { ownerAdminId?: string }
) {
  const days = clampAnalyticsDays(daysInput);
  const since = sinceDate(days);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const ownerId = opts?.ownerAdminId?.trim() || null;

  const productOwner = ownerId
    ? { product: { createdById: ownerId } }
    : {};

  const [
    totalClicks,
    previousClicks,
    clicksByDayRaw,
    topProductGroups,
    byCategoryRaw,
    byAdminRaw,
    recentReferers,
    recentAgents,
    byMarketplaceRaw,
  ] = await Promise.all([
    prisma.clickEvent.count({
      where: { createdAt: { gte: since }, ...productOwner },
    }),
    prisma.clickEvent.count({
      where: {
        createdAt: { gte: prevSince, lt: since },
        ...productOwner,
      },
    }),
    ownerId
      ? prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
          SELECT DATE(ce.\`createdAt\`) AS day, COUNT(*) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          WHERE ce.\`createdAt\` >= ${since} AND p.\`createdById\` = ${ownerId}
          GROUP BY DATE(ce.\`createdAt\`)
          ORDER BY day ASC
        `
      : prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
          SELECT DATE(\`createdAt\`) AS day, COUNT(*) AS count
          FROM \`ClickEvent\`
          WHERE \`createdAt\` >= ${since}
          GROUP BY DATE(\`createdAt\`)
          ORDER BY day ASC
        `,
    prisma.clickEvent.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: since }, ...productOwner },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    ownerId
      ? prisma.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
          SELECT c.id, c.name, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          INNER JOIN \`Category\` c ON c.id = p.\`categoryId\`
          WHERE ce.\`createdAt\` >= ${since} AND p.\`createdById\` = ${ownerId}
          GROUP BY c.id, c.name
          ORDER BY count DESC
          LIMIT 8
        `
      : prisma.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
          SELECT c.id, c.name, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          INNER JOIN \`Category\` c ON c.id = p.\`categoryId\`
          WHERE ce.\`createdAt\` >= ${since}
          GROUP BY c.id, c.name
          ORDER BY count DESC
          LIMIT 8
        `,
    ownerId
      ? prisma.$queryRaw<
          Array<{
            id: string | null;
            name: string | null;
            email: string | null;
            count: bigint;
          }>
        >`
          SELECT a.id, a.name, a.email, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          LEFT JOIN \`AdminUser\` a ON a.id = p.\`createdById\`
          WHERE ce.\`createdAt\` >= ${since} AND p.\`createdById\` = ${ownerId}
          GROUP BY a.id, a.name, a.email
          ORDER BY count DESC
          LIMIT 8
        `
      : prisma.$queryRaw<
          Array<{
            id: string | null;
            name: string | null;
            email: string | null;
            count: bigint;
          }>
        >`
          SELECT a.id, a.name, a.email, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          LEFT JOIN \`AdminUser\` a ON a.id = p.\`createdById\`
          WHERE ce.\`createdAt\` >= ${since}
          GROUP BY a.id, a.name, a.email
          ORDER BY count DESC
          LIMIT 8
        `,
    prisma.clickEvent.findMany({
      where: {
        createdAt: { gte: since },
        referer: { not: null },
        ...productOwner,
      },
      select: { referer: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.clickEvent.findMany({
      where: { createdAt: { gte: since }, ...productOwner },
      select: { userAgent: true },
      take: 8000,
      orderBy: { createdAt: "desc" },
    }),
    ownerId
      ? prisma.$queryRaw<Array<{ marketplace: string; count: bigint }>>`
          SELECT COALESCE(p.marketplace, 'US') AS marketplace, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          WHERE ce.\`createdAt\` >= ${since} AND p.\`createdById\` = ${ownerId}
          GROUP BY COALESCE(p.marketplace, 'US')
          ORDER BY count DESC
        `
      : prisma.$queryRaw<Array<{ marketplace: string; count: bigint }>>`
          SELECT COALESCE(p.marketplace, 'US') AS marketplace, COUNT(ce.id) AS count
          FROM \`ClickEvent\` ce
          INNER JOIN \`Product\` p ON p.id = ce.\`productId\`
          WHERE ce.\`createdAt\` >= ${since}
          GROUP BY COALESCE(p.marketplace, 'US')
          ORDER BY count DESC
        `,
  ]);

  const productIds = topProductGroups.map((g) => g.productId);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          marketplace: true,
          category: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
        },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProducts: ProductClickRow[] = topProductGroups
    .map((g) => {
      const p = productMap.get(g.productId);
      if (!p) return null;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        imageUrl: p.imageUrl,
        categoryName: p.category.name,
        adminName: p.createdBy?.name || p.createdBy?.email || "—",
        marketplace: p.marketplace || "US",
        count: g._count.id,
      };
    })
    .filter((row): row is ProductClickRow => row !== null);

  const byDayMap = new Map(
    clicksByDayRaw.map((r) => [
      new Date(r.day).toISOString().slice(0, 10),
      Number(r.count),
    ])
  );

  // Fill every calendar day in the range so a single busy day
  // doesn't render as one lone full-width bar with no context.
  const clicksByDay: DayBucket[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    clicksByDay.push({ day: key, count: byDayMap.get(key) || 0 });
  }

  const byCategory: NamedCount[] = byCategoryRaw.map((r) => ({
    id: r.id,
    name: r.name,
    count: Number(r.count),
  }));

  const byMarketplace: NamedCount[] = byMarketplaceRaw.map((r) => ({
    id: r.marketplace || "US",
    name:
      r.marketplace === "CA" ? "Amazon.ca (Canada)" : r.marketplace === "UK"
        ? "Amazon.co.uk (UK)"
        : "Amazon.com (US)",
    count: Number(r.count),
  }));

  const byAdmin: NamedCount[] = byAdminRaw.map((r) => ({
    id: r.id || "unknown",
    name: r.name?.trim() || r.email || "Unknown admin",
    count: Number(r.count),
  }));

  const landingMap = new Map<string, number>();
  for (const row of recentReferers) {
    const path = landingPathFromReferer(row.referer);
    if (!path) continue;
    landingMap.set(path, (landingMap.get(path) || 0) + 1);
  }
  const topLandings: LandingRow[] = [...landingMap.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const maxDay = Math.max(1, ...clicksByDay.map((d) => d.count));
  const peakBucket =
    clicksByDay.reduce(
      (best, d) => (d.count > best.count ? d : best),
      clicksByDay[0] || { day: "", count: 0 }
    );
  const activeDays = clicksByDay.filter((d) => d.count > 0).length;
  const avgPerDay =
    days > 0 ? Math.round((totalClicks / days) * 10) / 10 : 0;

  const deltaPct =
    previousClicks === 0
      ? totalClicks > 0
        ? 100
        : 0
      : Math.round(((totalClicks - previousClicks) / previousClicks) * 100);

  const deviceLabels: Record<DeviceClass, string> = {
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
    unknown: "Unknown",
  };
  const deviceMap = new Map<DeviceClass, number>();
  for (const row of recentAgents) {
    const cls = classifyDevice(row.userAgent);
    deviceMap.set(cls, (deviceMap.get(cls) || 0) + 1);
  }
  // Scale sample counts to total if we capped the sample
  const sampleSize = recentAgents.length;
  const byDevice: DeviceCount[] = (
    ["mobile", "desktop", "tablet", "unknown"] as DeviceClass[]
  )
    .map((id) => {
      const sampleCount = deviceMap.get(id) || 0;
      const count =
        sampleSize > 0 && sampleSize < totalClicks
          ? Math.round((sampleCount / sampleSize) * totalClicks)
          : sampleCount;
      return { id, name: deviceLabels[id], count };
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    days,
    since,
    totalClicks,
    previousClicks,
    deltaPct,
    avgPerDay,
    activeDays,
    peakDay: peakBucket,
    clicksByDay,
    maxDay,
    topProducts,
    byCategory,
    byMarketplace,
    byAdmin,
    topLandings,
    byDevice,
  };
}
