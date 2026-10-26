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
import { AdminCard, PageHeader, primaryButtonClass } from "@/components/admin/ui";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const admin = await requireAdminSession();
  const superAdmin = isSuperAdmin(admin);
  const productsOk = canAccessProducts(admin);
  const amazonOk = await isAmazonConfigured();
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
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={superAdmin ? "Everything on the site at a glance." : "Your deals at a glance."}
        action={
          productsOk ? (
            <Link href="/admin/products/new" className={primaryButtonClass}>
              <Plus className="h-4 w-4" aria-hidden />
              Add Deal
            </Link>
          ) : undefined
        }
      />

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
            <Stat label="Products" value={productCount} href="/admin/products" icon={Package} />
            <Stat label="Clicks, last 7 days" value={clickCount7d} href="/admin/analytics" icon={MousePointerClick} />
          </>
        )}
        {superAdmin && (
          <>
            <Stat label="Categories" value={categoryCount} href="/admin/categories" icon={FolderOpen} />
            <Stat label="Admins" value={adminCount} href="/admin/admins" icon={Users} />
          </>
        )}
      </div>

      {superAdmin && (
        <Link
          href="/admin/automation"
          className="pressable group flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border-subtle sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold text-foreground">Automation</span>
            <span className="mt-0.5 block text-[15px] text-muted">
              Share new deals to Facebook, Threads and Telegram with the paid-link disclosure.
            </span>
          </span>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </Link>
      )}

      {productsOk && (
        <AdminCard className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold text-foreground">Recent Products</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {amazonOk
                  ? "Refresh photos from Amazon, or open a product to edit it."
                  : "Amazon import isn't connected yet. Photos stay as saved."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RefreshAmazonButton configured={amazonOk} />
              <Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-brand hover:bg-brand-soft">
                See All
              </Link>
            </div>
          </div>

          {recentProducts.length === 0 ? (
            <p className="p-10 text-center text-[15px] text-muted">
              No products yet.{" "}
              <Link href="/admin/products/new" className="font-semibold text-brand hover:underline">
                Add the first deal
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recentProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <span className="shelf relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-border-subtle">
                    <Image src={p.imageUrl} alt="" fill className="object-contain p-1" sizes="48px" unoptimized />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="line-clamp-1 text-[15px] font-medium text-foreground hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {p.marketplace || "US"} · {p.category.name} · {p.clickCount}{" "}
                      {p.clickCount === 1 ? "click" : "clicks"}
                      {superAdmin && (p.createdBy?.name || p.createdBy?.email)
                        ? ` · ${p.createdBy?.name || p.createdBy?.email}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium sm:inline ${
                      p.isPublished ? "bg-success-soft text-success" : "bg-card-muted text-muted"
                    }`}
                  >
                    {p.isPublished ? "Published" : "Draft"}
                  </span>
                  <CopyDealUrlButton slug={p.slug} siteUrl={siteUrl} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      {!productsOk && !superAdmin && (
        <p className="rounded-2xl bg-card px-4 py-10 text-center text-[15px] text-muted ring-1 ring-border-subtle">
          Your account can&apos;t manage products yet. Ask a Super Admin to turn on product access.
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
      className="pressable rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border-subtle"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
      </span>
      <span className="mt-2 block text-[28px] font-bold leading-none tabular-nums text-foreground">
        {value}
      </span>
    </Link>
  );
}
