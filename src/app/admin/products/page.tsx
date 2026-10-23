import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductAccess } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/permissions";
import { adminProductWhere } from "@/lib/product-query";
import {
  ProductTable,
  AdminProductRow,
} from "@/components/admin/ProductTable";
import { AdminProductFilter } from "@/components/admin/AdminProductFilter";

export const metadata = { title: "Products — Admin" };

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    admin?: string;
    q?: string;
    archived?: string;
    page?: string;
    market?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const session = await requireProductAccess();
  const sp = await searchParams;
  const q = sp.q || "";
  const archived = sp.archived === "1";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const marketRaw = (sp.market || "").toUpperCase();
  const marketplace =
    marketRaw === "US" || marketRaw === "UK" ? marketRaw : null;
  // Super Admin can filter any admin; normal admins only see their own products
  const adminFilter = isSuperAdmin(session) ? sp.admin : session.id;
  const where = adminProductWhere({
    adminId: adminFilter,
    q,
    archived,
    marketplace,
  });

  const [total, products, admins] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { include: { parent: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    isSuperAdmin(session)
      ? prisma.adminUser.findMany({
          where: { OR: [{ products: { some: {} } }, { isActive: true }] },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    imageUrl: p.imageUrl,
    affiliateUrl: p.affiliateUrl,
    marketplace: p.marketplace || "US",
    isPublished: p.isPublished,
    isTrending: p.isTrending,
    createdAt: p.createdAt.toISOString(),
    categoryName: p.category.parent
      ? `${p.category.parent.name} › ${p.category.name}`
      : p.category.name,
    createdByName: p.createdBy?.name || p.createdBy?.email || null,
    clickCount: p.clickCount,
    deletedAt: p.deletedAt?.toISOString() || null,
    expiresAt: p.expiresAt?.toISOString() || null,
    asin: p.asin,
    scheduledAt: p.scheduledAt?.toISOString() || null,
    linkStatus: p.linkStatus,
  }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const selectedAdmin = admins.find((a) => a.id === adminFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (isSuperAdmin(session) && adminFilter) params.set("admin", adminFilter);
    if (q) params.set("q", q);
    if (marketplace) params.set("market", marketplace);
    if (archived) params.set("archived", "1");
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products / Deals</h1>
          <p className="text-sm text-muted mt-1">
            {archived
              ? "Archived deals — restore or permanently delete."
              : selectedAdmin
                ? `Showing deals added by ${selectedAdmin.name || "this admin"}`
                : "Manage deals, track clicks, archive, or sync from Amazon."}
            {marketplace ? ` · ${marketplace} store` : ""}
            {" · "}
            {total} result{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Suspense fallback={null}>
            <AdminProductFilter
              admins={admins.map((a) => ({
                id: a.id,
                name: a.name || a.id,
              }))}
            />
          </Suspense>
          {!archived && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm shadow-brand/20"
            >
              <Plus className="h-4 w-4" /> Add deal
            </Link>
          )}
        </div>
      </div>

      <ProductTable products={rows} siteUrl={siteUrl} archived={archived} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="admin-edge-btn rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className="admin-edge-btn rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
