import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProductAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { canManageOwnedProduct } from "@/lib/permissions";

export const metadata = { title: "Product analytics" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
};

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: Props) {
  const admin = await requireProductAccess();
  const { id } = await params;
  const sp = await searchParams;
  const days = sp.days === "7" || sp.days === "30" ? Number(sp.days) : 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      clickCount: true,
      isPublished: true,
      linkStatus: true,
      createdById: true,
      category: { select: { name: true } },
    },
  });
  if (!product) notFound();
  if (!canManageOwnedProduct(admin, product)) notFound();

  const [totalInRange, byDayRaw, byCampaignRaw] = await Promise.all([
    prisma.clickEvent.count({
      where: { productId: id, createdAt: { gte: since } },
    }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "ClickEvent"
      WHERE "productId" = ${id} AND "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `,
    prisma.$queryRaw<Array<{ campaign: string | null; count: bigint }>>`
      SELECT COALESCE(campaign, 'direct') AS campaign, COUNT(*)::bigint AS count
      FROM "ClickEvent"
      WHERE "productId" = ${id} AND "createdAt" >= ${since}
      GROUP BY COALESCE(campaign, 'direct')
      ORDER BY count DESC
    `,
  ]);

  const byDayMap = new Map(
    byDayRaw.map((r) => [
      new Date(r.day).toISOString().slice(0, 10),
      Number(r.count),
    ])
  );
  const daysSeries: { day: string; count: number }[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daysSeries.push({ day: key, count: byDayMap.get(key) || 0 });
  }
  const maxDay = Math.max(1, ...daysSeries.map((d) => d.count));

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
        <Link href="/admin/analytics" className="hover:text-brand">
          Analytics
        </Link>
        <span>/</span>
        <span className="text-muted">Product</span>
      </div>

      <header className="flex gap-4 items-start">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-card-muted">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground line-clamp-2">
            {product.title}
          </h1>
          <p className="text-xs text-muted-fg mt-1">
            {product.category.name} · lifetime {product.clickCount} clicks ·
            link {product.linkStatus}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([7, 14, 30] as const).map((d) => (
              <Link
                key={d}
                href={`/admin/analytics/product/${id}?days=${d}`}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  days === d
                    ? "bg-brand text-on-brand"
                    : "border border-border text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {d}d
              </Link>
            ))}
            <Link
              href={`/admin/products/${id}/edit`}
              className="rounded-full border border-brand/25 bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-on-brand"
            >
              Edit
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs text-muted-fg">Clicks in range</p>
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {totalInRange}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Daily clicks
        </h2>
        <div className="flex items-end gap-0.5 h-36 border-b border-l border-border pl-1">
          {daysSeries.map((d) => (
            <div
              key={d.day}
              className="flex-1 flex items-end justify-center h-full"
              title={`${d.day}: ${d.count}`}
            >
              <div
                className="w-full max-w-[14px] rounded-t-sm bg-brand/80"
                style={{
                  height:
                    d.count === 0
                      ? "0%"
                      : `${Math.max(4, (d.count / maxDay) * 100)}%`,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          By campaign ({days}d)
        </h2>
        {byCampaignRaw.length === 0 ? (
          <p className="text-xs text-muted-fg py-4 text-center">
            No clicks in this range.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {byCampaignRaw.map((r) => (
              <li
                key={String(r.campaign)}
                className="flex justify-between py-2 text-xs"
              >
                <span className="font-medium text-foreground">
                  {r.campaign || "direct"}
                </span>
                <span className="tabular-nums font-semibold">
                  {Number(r.count)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
