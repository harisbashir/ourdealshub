import Image from "next/image";
import Link from "next/link";
import {
  Package,
  FolderOpen,
  Plus,
  Users,
  MousePointerClick,
  Bot,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { canAccessProducts, isSuperAdmin } from "@/lib/permissions";
import { isAmazonConfigured } from "@/lib/amazon";
import { RefreshAmazonButton } from "@/components/admin/RefreshAmazonButton";
import { CopyDealUrlButton } from "@/components/admin/CopyDealUrlButton";
import { GoLiveChecklist } from "@/components/admin/GoLiveChecklist";
import { getGoLiveReadiness } from "@/lib/go-live-readiness";
import { AdminHScroll } from "@/components/admin/AdminHScroll";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const admin = await requireAdminSession();
  const superAdmin = isSuperAdmin(admin);
  const productsOk = canAccessProducts(admin);
  const amazonOk = isAmazonConfigured();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  /** Staff only see their own inventory; Super Admin sees site-wide. */
  const ownedFilter = superAdmin
    ? { deletedAt: null as Date | null }
    : { deletedAt: null as Date | null, createdById: admin.id };

  const [
    productCount,
    categoryCount,
    adminCount,
    clickCount7d,
    recentProducts,
    readiness,
  ] = await Promise.all([
    productsOk ? prisma.product.count({ where: ownedFilter }) : Promise.resolve(0),
    superAdmin ? prisma.category.count() : Promise.resolve(0),
    superAdmin ? prisma.adminUser.count() : Promise.resolve(0),
    productsOk
      ? prisma.clickEvent.count({
          where: {
            createdAt: { gte: since },
            ...(superAdmin
              ? {}
              : { product: { createdById: admin.id, deletedAt: null } }),
          },
        })
      : Promise.resolve(0),
    productsOk
      ? prisma.product.findMany({
          where: ownedFilter,
          take: 8,
          orderBy: { createdAt: "desc" },
          include: {
            category: true,
            createdBy: { select: { name: true, email: true } },
          },
        })
      : Promise.resolve([]),
    superAdmin ? getGoLiveReadiness() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="admin-shell-static rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              Overview
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted truncate">
              Welcome back — manage deals, tracking, and launch prep from here.
            </p>
          </div>
          {productsOk && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 hover:bg-brand-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add deal
            </Link>
          )}
        </div>
      </section>

      {readiness && !readiness.dashboardComplete && (
        <GoLiveChecklist
          items={readiness.items}
          readyExceptApis={readiness.readyExceptApis}
          apisReady={readiness.apisReady}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {productsOk && (
          <>
            <Stat
              label="Products"
              value={productCount}
              href="/admin/products"
              icon={Package}
            />
            <Stat
              label="Clicks (7d)"
              value={clickCount7d}
              href="/admin/analytics"
              icon={MousePointerClick}
            />
          </>
        )}
        {superAdmin && (
          <>
            <Stat
              label="Categories"
              value={categoryCount}
              href="/admin/categories"
              icon={FolderOpen}
            />
            <Stat
              label="Admins"
              value={adminCount}
              href="/admin/admins"
              icon={Users}
            />
          </>
        )}
      </div>

      {superAdmin && (
        <Link
          href="/admin/automation"
          className="admin-deal-card group flex items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand border border-brand/20">
            <Bot className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-foreground">
                Automation
              </span>
              <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                Focus
              </span>
            </span>
            <span className="mt-0.5 block text-xs sm:text-sm text-muted">
              Facebook &amp; Threads share packs — post-ready captions with #ad
            </span>
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted group-hover:text-brand transition-colors shrink-0" />
        </Link>
      )}

      {productsOk && (
        <section className="admin-shell-static rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border px-4 sm:px-5 py-3.5 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Recent products
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {amazonOk
                  ? "Sync recent deals from Amazon, or open a product to edit"
                  : "Amazon API not configured — using stored images"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <RefreshAmazonButton configured={amazonOk} />
              <Link
                href="/admin/products"
                className="text-xs sm:text-sm font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            </div>
          </div>

          <AdminHScroll>
            <div className="min-w-[680px] p-2.5 space-y-2">
              <div className="grid grid-cols-[minmax(200px,1.5fr)_auto_auto_auto_auto_auto] gap-x-2 items-center text-muted text-sm px-3 py-1">
                <span className="px-1 font-medium">Product</span>
                <span className="px-1 font-medium">Copy</span>
                <span className="px-1 font-medium">Category</span>
                <span className="px-1 font-medium">Clicks</span>
                <span className="px-1 font-medium">By</span>
                <span className="px-1 font-medium">Status</span>
              </div>

              {recentProducts.map((p) => (
                <article
                  key={p.id}
                  className="admin-deal-card grid grid-cols-[minmax(200px,1.5fr)_auto_auto_auto_auto_auto] gap-x-2 items-center rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="flex items-center gap-2.5 min-w-0 px-1 group"
                  >
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide leading-none ${
                        p.marketplace === "UK"
                          ? "border-sky-500/50 bg-sky-500 text-white"
                          : "border-brand/50 bg-brand text-white"
                      }`}
                      title={
                        p.marketplace === "UK"
                          ? "Amazon.co.uk (UK)"
                          : "Amazon.com (US)"
                      }
                    >
                      {p.marketplace === "UK" ? "UK" : "US"}
                    </span>
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-card-muted border border-border">
                      <Image
                        src={p.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                        unoptimized
                      />
                    </span>
                    <span className="font-medium text-foreground group-hover:text-brand line-clamp-2 text-xs sm:text-sm">
                      {p.title.slice(0, 60)}
                      {p.title.length > 60 ? "…" : ""}
                    </span>
                  </Link>
                  <div className="px-1">
                    <CopyDealUrlButton slug={p.slug} siteUrl={siteUrl} />
                  </div>
                  <div className="px-1 text-muted whitespace-nowrap">
                    {p.category.name}
                  </div>
                  <div className="px-1 tabular-nums text-foreground font-medium">
                    {p.clickCount}
                  </div>
                  <div className="px-1 text-muted text-xs max-w-[100px] truncate">
                    {p.createdBy?.name || p.createdBy?.email || "—"}
                  </div>
                  <div className="px-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.isPublished
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-card-muted text-muted"
                      }`}
                    >
                      {p.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </article>
              ))}

              {recentProducts.length === 0 && (
                <p className="p-10 text-center text-muted text-sm">
                  No products yet.{" "}
                  <Link
                    href="/admin/products/new"
                    className="font-semibold text-brand hover:underline"
                  >
                    Add your first deal
                  </Link>
                </p>
              )}
            </div>
          </AdminHScroll>
        </section>
      )}

      {!productsOk && !superAdmin && (
        <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-muted text-sm">
          Your account does not have product permissions. Contact the Super
          Admin.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="admin-deal-card group rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted truncate">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand border border-brand/20">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none tracking-tight">
        {value}
      </p>
    </Link>
  );
}
