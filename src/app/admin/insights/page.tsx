import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Download,
  KeyRound,
  Link2Off,
  MousePointerClick,
  Radio,
  XCircle,
} from "lucide-react";
import { requireProductAccess } from "@/lib/admin-auth";
import { getOpsInsights } from "@/lib/ops-insights";
import {
  publishDueScheduledNow,
  runLinkHealthCheck,
} from "@/lib/admin-actions";

export const metadata = { title: "Ops Insights" };

type Props = { searchParams: Promise<{ days?: string }> };

export default async function InsightsPage({ searchParams }: Props) {
  await requireProductAccess();
  const sp = await searchParams;
  const days = sp.days === "14" || sp.days === "30" ? Number(sp.days) : 7;
  const data = await getOpsInsights(days);

  return (
    <div className="max-w-5xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Operations
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Insights &amp; alerts
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Dead deals, broken links, schedule queue, campaign mix — last{" "}
            {days} days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([7, 14, 30] as const).map((d) => (
            <Link
              key={d}
              href={`/admin/insights?days=${d}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                days === d
                  ? "bg-brand text-on-brand"
                  : "border border-border bg-card text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {d}d
            </Link>
          ))}
          <a
            href="/api/admin/export?type=products"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-on-brand transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export products
          </a>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <form action={runLinkCheckAction}>
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted hover:border-brand hover:text-brand transition-colors"
          >
            Run link health check (up to 20)
          </button>
        </form>
        {data.scheduled.length > 0 && (
          <form action={publishDueAction}>
            <button
              type="submit"
              className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand hover:text-on-brand transition-colors"
            >
              Publish due schedules now
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stat
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Top movers"
          value={String(data.topProducts.length)}
        />
        <Stat
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Dead deals"
          value={String(data.deadProducts.length)}
          warn={data.deadProducts.length > 0}
        />
        <Stat
          icon={<Link2Off className="h-4 w-4" />}
          label="Broken links"
          value={String(data.brokenLinks.length)}
          warn={data.brokenLinks.length > 0}
        />
        <Stat
          icon={<CalendarClock className="h-4 w-4" />}
          label="Scheduled"
          value={String(data.scheduled.length)}
        />
        <Stat
          icon={<XCircle className="h-4 w-4" />}
          label="Failed posts"
          value={String(data.failedPostCount)}
          warn={data.failedPostCount > 0}
        />
        <Stat
          icon={<KeyRound className="h-4 w-4" />}
          label="Tokens expiring"
          value={String(data.tokensExpiring.length)}
          warn={data.tokensExpiring.length > 0}
        />
      </div>

      {(data.tokensExpiring.length > 0 || data.failedPosts.length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {data.tokensExpiring.length > 0 && (
            <Card
              title="Tokens expiring soon"
              subtitle="Reconnect in Automation within 7 days"
            >
              <ul className="divide-y divide-border-subtle">
                {data.tokensExpiring.map((t) => (
                  <li
                    key={t.platform}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <Link
                      href="/admin/automation"
                      className="text-xs font-medium text-warning hover:text-brand"
                    >
                      {t.platform} · {t.pageName}
                    </Link>
                    <span className="text-xs tabular-nums text-warning">
                      {new Date(t.tokenExpiresAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.failedPosts.length > 0 && (
            <Card
              title="Failed social posts"
              subtitle={`Last ${days}d · retry from Automation`}
              className={data.tokensExpiring.length === 0 ? "col-span-2" : ""}
            >
              <ul className="divide-y divide-border-subtle">
                {data.failedPosts.map((f) => (
                  <li key={f.id} className="py-2">
                    <p className="text-xs font-medium text-foreground line-clamp-1">
                      {f.productTitle}
                    </p>
                    <p className="text-xs text-danger line-clamp-1">
                      {f.platform}: {f.error}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card title="Top products" subtitle={`By clicks · ${days}d`}>
          {data.topProducts.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.topProducts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="shrink-0 rounded-md bg-card-muted px-1.5 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border"
                    >
                      {p.marketplace || "US"}
                    </span>
                    <Link
                      href={`/admin/analytics/product/${p.id}`}
                      className="text-xs font-medium text-foreground hover:text-brand line-clamp-1"
                    >
                      {p.title}
                    </Link>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-brand">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Clicks by store" subtitle={`US vs UK · ${days}d`}>
          {data.clicksByMarketplace.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.clicksByMarketplace.map((m) => (
                <li
                  key={m.marketplace}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="text-xs font-medium text-foreground">
                    {m.marketplace === "CA" ? "Amazon.ca (Canada)" : m.marketplace === "UK"
                      ? "Amazon.co.uk (UK)"
                      : "Amazon.com (US)"}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-brand">
                    {m.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Campaign mix"
          subtitle="From /go?src= · UTM-style channels"
        >
          {data.byCampaign.length === 0 ? (
            <Empty hint="No attributed clicks yet. Social auto-post uses ?src=." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.byCampaign.map((c) => (
                <li
                  key={c.campaign}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Radio className="h-3 w-3 text-brand" />
                    {c.campaign}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Dead deals"
          subtitle={`Published, 0 clicks, older than ${days}d`}
        >
          {data.deadProducts.length === 0 ? (
            <Empty hint="None — good coverage." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.deadProducts.map((p) => (
                <li key={p.id} className="py-2">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-xs font-medium text-foreground hover:text-brand line-clamp-1"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-fg">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Broken / flagged links" subtitle="From health check">
          {data.brokenLinks.length === 0 ? (
            <Empty hint="No broken flags. Run a check periodically." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.brokenLinks.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-xs font-medium text-danger hover:underline line-clamp-1"
                  >
                    {p.title}
                  </Link>
                  <span className="text-xs uppercase font-semibold text-danger">
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Scheduled queue"
          subtitle="Drafts waiting for cron publish"
          className="col-span-2"
        >
          {data.scheduled.length === 0 ? (
            <Empty hint="No scheduled drafts. Set a schedule on product edit." />
          ) : (
            <ul className="divide-y divide-border-subtle sm:columns-2 sm:gap-6">
              {data.scheduled.map((p) => (
                <li key={p.id} className="break-inside-avoid py-2">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-xs font-medium text-foreground hover:text-brand line-clamp-1"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-fg tabular-nums">
                    {new Date(p.scheduledAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted-fg max-w-2xl leading-relaxed">
        Daily cron:{" "}
        <code className="text-xs bg-card-muted px-1 rounded">
          GET /api/cron/daily
        </code>{" "}
        with header{" "}
        <code className="text-xs bg-card-muted px-1 rounded">
          Authorization: Bearer CRON_SECRET
        </code>
        . Publishes due schedules and sends a Telegram digest if connected.
      </p>
    </div>
  );
}

async function runLinkCheckAction() {
  "use server";
  await runLinkHealthCheck(20);
}

async function publishDueAction() {
  "use server";
  await publishDueScheduledNow();
}

function Stat({
  icon,
  label,
  value,
  warn,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl sm:rounded-2xl border bg-card px-2.5 sm:px-4 py-2.5 sm:py-3 shadow-sm transition-colors hover:border-brand/40 ${
        warn ? "border-warning/30" : "border-border"
      }`}
    >
      <div className="flex items-center gap-1.5 text-brand">{icon}</div>
      <p className="mt-1 text-xs text-muted-fg leading-tight">
        {label}
      </p>
      <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:border-brand/45 min-w-0 ${className}`}
    >
      <div className="border-b border-border-subtle px-2.5 sm:px-4 py-2.5 sm:py-3">
        <h2 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
          {title}
        </h2>
        <p className="text-xs text-muted-fg mt-0.5 line-clamp-2">
          {subtitle}
        </p>
      </div>
      <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 max-h-72 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

function Empty({ hint }: { hint?: string }) {
  return (
    <p className="text-xs text-muted-fg py-6 text-center">
      {hint || "Nothing here yet."}
    </p>
  );
}
