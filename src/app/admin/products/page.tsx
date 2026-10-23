import Link from "next/link";
import { PageHeader, primaryButtonClass, secondaryButtonClass } from "@/components/admin/ui";
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
      <PageHeader
        title={archived ? "Archived Products" : "Products"}
        description={
          (archived
            ? "Restore archived deals or delete them permanently."
            : selectedAdmin
              ? `Deals added by ${selectedAdmin.name || "this admin"}.`
              : "Edit, share and track your deals.") +
          (marketplace ? ` ${marketplace} store.` : "") +
          ` ${total} ${total === 1 ? "result" : "results"}.`
        }
        action={
          !archived ? (
            <Link href="/admin/products/new" className={primaryButtonClass}>
              <Plus className="h-4 w-4" aria-hidden /> Add Deal
            </Link>
          ) : undefined
        }
      />
      <div className="mb-4">
        <Suspense fallback={null}>
          <AdminProductFilter
            admins={admins.map((a) => ({
              id: a.id,
              name: a.name || a.id,
            }))}
          />
        </Suspense>
      </div>

      <ProductTable products={rows} siteUrl={siteUrl} archived={archived} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className={secondaryButtonClass}
            >
              Previous
            </Link>
          )}
          <span className="text-[15px] text-muted tabular-nums">
            {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className={secondaryButtonClass}
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
