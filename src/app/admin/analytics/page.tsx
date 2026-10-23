import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { requireProductAccess } from "@/lib/admin-auth";
import {
  clampAnalyticsDays,
  getClickAnalytics,
  type AnalyticsRange,
} from "@/lib/click-analytics";
import { ClicksByDayChart } from "@/components/admin/ClicksByDayChart";
import { AnalyticsRangeForm } from "@/components/admin/AnalyticsRangeForm";
import { isSuperAdmin } from "@/lib/permissions";

export const metadata = { title: "Click Analytics" };

/** Keep cards readable even with dozens of categories/products. */
const TOP_N = 6;

type Props = {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
};

function daysFromCustom(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T23:59:59Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
    return null;
  }
  const ms = b.getTime() - a.getTime();
  return clampAnalyticsDays(Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function sharePct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Top N rows + rolled-up “Other” so long tails never blow up the card. */
function topWithOther<T extends { count: number }>(
  rows: T[],
  limit: number,
  universeTotal: number
): { top: T[]; otherCount: number } {
  const top = rows.slice(0, limit);
  const shown = top.reduce((s, r) => s + r.count, 0);
  const otherCount = Math.max(0, universeTotal - shown);
  return { top, otherCount };
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const admin = await requireProductAccess();
  const sp = await searchParams;
  const customDays = daysFromCustom(sp.from, sp.to);
  const days = customDays ?? clampAnalyticsDays(sp.days);
  const isPreset = customDays == null && (days === 7 || days === 14 || days === 30);
  const data = await getClickAnalytics(
    days,
    isSuperAdmin(admin) ? undefined : { ownerAdminId: admin.id }
  );

  const trend =
    data.deltaPct > 0 ? "up" : data.deltaPct < 0 ? "down" : "flat";
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const products = topWithOther(data.topProducts, TOP_N, data.totalClicks);
  const categories = topWithOther(data.byCategory, TOP_N, data.totalClicks);
  const markets = topWithOther(data.byMarketplace, TOP_N, data.totalClicks);
  const admins = topWithOther(data.byAdmin, TOP_N, data.totalClicks);
  const landingTotal = data.topLandings.reduce((s, r) => s + r.count, 0);
  const landings = topWithOther(data.topLandings, TOP_N, landingTotal);

  return (
    <div className="max-w-5xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            Performance
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Click analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Outbound Amazon clicks · bots &amp; flood spikes filtered · last{" "}
            {days} days
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div
              role="tablist"
              aria-label="Date range"
              className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm hover:border-brand/40 transition-colors"
            >
              {([7, 14, 30] as AnalyticsRange[]).map((d) => {
                const active = isPreset && days === d;
                return (
                  <Link
                    key={d}
                    href={`/admin/analytics?days=${d}`}
                    role="tab"
                    aria-selected={active}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                      active
                        ? "bg-brand text-white shadow-sm shadow-brand/25"
                        : "text-gray-600 hover:text-brand hover:bg-orange-50"
                    }`}
                  >
                    {d}d
                  </Link>
                );
              })}
            </div>
            <a
              href={`/api/admin/export?type=analytics&days=${days}`}
              className="inline-flex items-center rounded-full border border-brand/25 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
            >
              Export CSV
            </a>
          </div>
          <AnalyticsRangeForm from={sp.from} to={sp.to} />
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200/80 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-brand/45 hover:shadow-md hover:shadow-brand/5">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
          <Kpi
            label="Total clicks"
            value={fmt(data.totalClicks)}
            accent
            footnote={
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  trend === "up"
                    ? "text-emerald-600"
                    : trend === "down"
                      ? "text-red-600"
                      : "text-stone-500"
                }`}
              >
                <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                {data.deltaPct > 0 ? "+" : ""}
                {data.deltaPct}% vs prior {days}d
              </span>
            }
          />
          <Kpi
            label="Daily average"
            value={fmt(data.avgPerDay)}
            footnote={`${data.activeDays} of ${days} days had clicks`}
          />
          <Kpi
            label="Peak day"
            value={fmt(data.peakDay.count)}
            footnote={
              data.peakDay.day
                ? new Date(data.peakDay.day + "T12:00:00Z").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", timeZone: "UTC" }
                  )
                : "—"
            }
          />
          <Kpi
            label="Prior period"
            value={fmt(data.previousClicks)}
            footnote={`Previous ${days}-day window`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-all duration-200 hover:border-brand/45 hover:shadow-md hover:shadow-brand/5">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 sm:px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-brand">
              Clicks over time
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily volume · dashed line is the period average
            </p>
          </div>
          {data.totalClicks > 0 && (
            <p className="text-[11px] font-medium text-brand/80 tabular-nums shrink-0 pt-0.5 rounded-full bg-orange-50 px-2 py-0.5">
              Max {fmt(data.maxDay)}/day
            </p>
          )}
        </div>
        <div className="px-2 sm:px-4 py-3">
          {data.clicksByDay.every((d) => d.count === 0) ? (
            <EmptyState message="No outbound clicks in this range yet." />
          ) : (
            <ClicksByDayChart
              days={data.clicksByDay}
              maxDay={data.maxDay}
              avgPerDay={data.avgPerDay}
            />
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Top products"
          subtitle={`Top ${TOP_N} by clicks`}
          footer={
            <Link
              href="/admin/products"
              className="text-[11px] font-semibold text-brand hover:text-white hover:bg-brand rounded-full px-2.5 py-1 transition-colors border border-brand/20 hover:border-brand"
            >
              All products
            </Link>
          }
        >
          {products.top.length === 0 ? (
            <EmptyState />
          ) : (
            <ProductTable
              rows={products.top}
              totalClicks={data.totalClicks}
              otherCount={products.otherCount}
              days={days}
            />
          )}
        </Panel>

        <Panel
          title="By marketplace"
          subtitle="US vs UK click share"
        >
          {markets.top.length === 0 ? (
            <EmptyState />
          ) : (
            <BreakdownTable
              rows={markets.top.map((r) => ({
                id: r.id,
                label: r.name,
                count: r.count,
              }))}
              total={data.totalClicks}
              max={markets.top[0]?.count ?? 1}
              otherCount={markets.otherCount}
            />
          )}
        </Panel>

        <Panel
          title="By category"
          subtitle={`Top ${TOP_N} · rest grouped as Other`}
        >
          {categories.top.length === 0 ? (
            <EmptyState />
          ) : (
            <BreakdownTable
              rows={categories.top.map((r) => ({
                id: r.id,
                label: r.name,
                count: r.count,
              }))}
              total={data.totalClicks}
              max={categories.top[0]?.count ?? 1}
              otherCount={categories.otherCount}
            />
          )}
        </Panel>

        <Panel title="By admin" subtitle={`Top ${TOP_N} · rest as Other`}>
          {admins.top.length === 0 ? (
            <EmptyState />
          ) : (
            <BreakdownTable
              rows={admins.top.map((r) => ({
                id: r.id,
                label: r.name,
                count: r.count,
              }))}
              total={data.totalClicks}
              max={admins.top[0]?.count ?? 1}
              otherCount={admins.otherCount}
            />
          )}
        </Panel>

        <Panel
          title="Devices"
          subtitle="From user-agent · IPs never stored"
        >
          {data.byDevice.length === 0 ? (
            <EmptyState />
          ) : (
            <BreakdownTable
              rows={data.byDevice.map((r) => ({
                id: r.id,
                label: r.name,
                count: r.count,
              }))}
              total={data.totalClicks}
              max={data.byDevice[0]?.count ?? 1}
            />
          )}
        </Panel>

        <Panel
          title="Landing pages"
          subtitle={`Top ${TOP_N} paths · sanitized`}
          className="lg:col-span-2"
        >
          {landings.top.length === 0 ? (
            <EmptyState message="No referer paths captured yet." />
          ) : (
            <BreakdownTable
              rows={landings.top.map((r) => ({
                id: r.path,
                label: r.path,
                count: r.count,
                mono: true,
              }))}
              total={landingTotal}
              max={landings.top[0]?.count ?? 1}
              otherCount={landings.otherCount}
              compact
            />
          )}
        </Panel>
      </div>

      <p className="text-[11px] text-stone-400 leading-relaxed max-w-2xl">
        Rankings show the top {TOP_N} only; remaining volume is rolled into
        &quot;Other&quot; so cards stay readable as catalog size grows. Bots and
        per-IP floods are not recorded. IPs are never stored. Earnings still come
        from Amazon Associates.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  footnote,
  accent = false,
}: {
  label: string;
  value: string;
  footnote: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3.5 sm:px-5 sm:py-4 transition-colors duration-200 hover:bg-orange-50/60 ${
        accent ? "relative" : ""
      }`}
    >
      {accent && (
        <span
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-brand/80"
          aria-hidden
        />
      )}
      <p className="text-[11px] font-medium text-stone-500 hover:text-brand">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 tabular-nums">
        {value}
      </p>
      <div className="mt-1.5 text-[11px] text-stone-400">{footnote}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`group rounded-2xl border border-stone-200/80 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 transition-all duration-200 hover:border-brand/50 hover:shadow-md hover:shadow-brand/10 ${className}`}
    >
      <div className="border-b border-stone-100 px-4 sm:px-5 py-3 flex items-start justify-between gap-2 transition-colors group-hover:border-brand/20 group-hover:bg-orange-50/40">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand">
            {title}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
        </div>
        {footer}
      </div>
      <div className="px-4 sm:px-5 py-3 max-h-[22rem] overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

function ProductTable({
  rows,
  totalClicks,
  otherCount,
  days,
}: {
  rows: {
    id: string;
    title: string;
    imageUrl: string;
    categoryName: string;
    adminName: string;
    marketplace?: string;
    count: number;
  }[];
  totalClicks: number;
  otherCount: number;
  days: number;
}) {
  return (
    <table className="w-full text-left">
      <thead className="sticky top-0 bg-white z-[1]">
        <tr className="text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
          <th className="pb-2 font-semibold w-6">#</th>
          <th className="pb-2 font-semibold">Product</th>
          <th className="pb-2 font-semibold text-right">Clicks</th>
          <th className="pb-2 font-semibold text-right w-12">Share</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-50">
        {rows.map((p, i) => (
          <tr
            key={p.id}
            className="align-middle transition-colors hover:bg-orange-50/70"
          >
            <td className="py-2 text-[11px] text-stone-400 tabular-nums group-hover:text-brand">
              {i + 1}
            </td>
            <td className="py-2 pr-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase ${
                    p.marketplace === "UK"
                      ? "bg-sky-500 text-white"
                      : "bg-brand text-white"
                  }`}
                >
                  {p.marketplace === "UK" ? "UK" : "US"}
                </span>
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-stone-50 border border-stone-100 transition-colors hover:border-brand/50">
                  <Image
                    src={p.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized
                  />
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/admin/analytics/product/${p.id}?days=${days}`}
                    className="block text-xs font-medium text-gray-900 line-clamp-1 hover:text-brand"
                    title={p.title}
                  >
                    {p.title}
                  </Link>
                  <p className="text-[10px] text-stone-400 truncate">
                    {p.categoryName}
                    <span className="text-stone-300"> · </span>
                    {p.adminName}
                  </p>
                </div>
              </div>
            </td>
            <td className="py-2 text-right text-xs font-semibold tabular-nums text-gray-900">
              {fmt(p.count)}
            </td>
            <td className="py-2 text-right text-[10px] tabular-nums text-brand/80 font-medium">
              {sharePct(p.count, totalClicks)}%
            </td>
          </tr>
        ))}
        {otherCount > 0 && (
          <tr className="align-middle text-stone-500 hover:bg-stone-50 transition-colors">
            <td className="py-2 text-[11px] tabular-nums">—</td>
            <td className="py-2 text-xs font-medium">Other products</td>
            <td className="py-2 text-right text-xs font-semibold tabular-nums">
              {fmt(otherCount)}
            </td>
            <td className="py-2 text-right text-[10px] tabular-nums">
              {sharePct(otherCount, totalClicks)}%
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function BreakdownTable({
  rows,
  total,
  max,
  otherCount = 0,
  compact = false,
}: {
  rows: { id: string; label: string; count: number; mono?: boolean }[];
  total: number;
  max: number;
  otherCount?: number;
  compact?: boolean;
}) {
  const peak = Math.max(1, max, otherCount);
  const displayRows = [
    ...rows,
    ...(otherCount > 0
      ? [{ id: "__other__", label: "Other", count: otherCount, mono: false }]
      : []),
  ];

  return (
    <table className="w-full text-left">
      <thead className="sticky top-0 bg-white z-[1]">
        <tr className="text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
          <th className="pb-2 font-semibold">Name</th>
          <th className="pb-2 font-semibold w-[30%]">Volume</th>
          <th className="pb-2 font-semibold text-right w-14">Clicks</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-50">
        {displayRows.map((r) => {
          const share = sharePct(r.count, total);
          const width = Math.max(4, (r.count / peak) * 100);
          const isOther = r.id === "__other__";
          return (
            <tr
              key={r.id}
              className={`transition-colors ${
                isOther
                  ? "text-stone-500 hover:bg-stone-50"
                  : "hover:bg-orange-50/70"
              }`}
            >
              <td
                className={`py-2 pr-3 min-w-0 ${
                  compact ? "max-w-[14rem] sm:max-w-none" : ""
                }`}
              >
                <span
                  className={`block text-xs truncate ${
                    isOther
                      ? "font-medium"
                      : r.mono
                        ? "font-mono text-[11px] text-stone-600"
                        : "font-medium text-gray-800"
                  }`}
                  title={r.label}
                >
                  {r.label}
                </span>
              </td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-orange-100/80 overflow-hidden ring-1 ring-brand/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOther ? "bg-stone-300" : "bg-brand"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px] tabular-nums text-brand/70 font-medium">
                    {share}%
                  </span>
                </div>
              </td>
              <td className="py-2 text-right text-xs font-semibold tabular-nums text-gray-900">
                {fmt(r.count)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-brand/25 bg-orange-50/40 px-3 py-8 text-center transition-colors hover:border-brand/45 hover:bg-orange-50/70">
      <p className="text-xs text-stone-500">
        {message || "No data in this range yet."}
      </p>
    </div>
  );
}
