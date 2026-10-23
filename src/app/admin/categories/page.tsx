import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { AdminHScroll } from "@/components/admin/AdminHScroll";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";

export const metadata = { title: "Categories — Admin" };

type CatRow = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  featured: boolean;
  badge: string | null;
  _count: { products: number; children?: number };
};

export default async function AdminCategoriesPage() {
  await assertSuperAdminPage();
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: true, children: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      },
    },
  });

  const rows: { c: CatRow; depth: number; childCount: number }[] = [];
  for (const c of categories) {
    rows.push({ c, depth: 0, childCount: c._count.children });
    for (const child of c.children) {
      rows.push({ c: child, depth: 1, childCount: 0 });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted mt-1">
            Main categories with optional subcategories (e.g. Electronics →
            Cables &amp; Chargers). Imports auto-create these from Amazon.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm shadow-brand/20"
        >
          <Plus className="h-4 w-4" /> Add category
        </Link>
      </div>

      <div className="admin-shell-static rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <AdminHScroll>
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(160px,1.4fr)_minmax(100px,1fr)_auto_auto_auto_auto] gap-x-2 items-center bg-card-muted text-left text-muted text-sm px-3 py-2.5 border-b border-border">
              <span className="px-1 font-medium">Name</span>
              <span className="px-1 font-medium">Slug</span>
              <span className="px-1 font-medium">Order</span>
              <span className="px-1 font-medium">Products</span>
              <span className="px-1 font-medium">Flags</span>
              <span className="px-1 font-medium">Actions</span>
            </div>

            <div className="space-y-2 p-2.5">
              {rows.map(({ c, depth, childCount }) => (
                <CategorySubCard
                  key={c.id}
                  c={c}
                  depth={depth}
                  childCount={childCount}
                />
              ))}
            </div>
          </div>
        </AdminHScroll>

        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">No categories yet.</p>
        )}
      </div>
    </div>
  );
}

function CategorySubCard({
  c,
  depth,
  childCount,
}: {
  c: CatRow;
  depth: number;
  childCount: number;
}) {
  return (
    <article className="admin-deal-card grid grid-cols-[minmax(160px,1.4fr)_minmax(100px,1fr)_auto_auto_auto_auto] gap-x-2 items-center rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      <div className="px-1 min-w-0">
        <span className={`font-medium text-foreground ${depth > 0 ? "pl-3" : ""}`}>
          {depth > 0 ? "↳ " : ""}
          {c.name}
        </span>
        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-fg">
          {depth === 0 ? "Main" : "Sub"}
        </span>
      </div>
      <div className="px-1 text-muted font-mono text-xs truncate">{c.slug}</div>
      <div className="px-1 text-foreground tabular-nums">{c.sortOrder}</div>
      <div className="px-1 text-foreground tabular-nums">{c._count.products}</div>
      <div className="px-1 whitespace-nowrap">
        {c.featured && (
          <span className="rounded bg-brand-soft text-brand text-xs px-1.5 py-0.5 font-medium">
            Featured
          </span>
        )}
        {c.badge && (
          <span className="ml-1 rounded bg-card-muted text-muted text-xs px-1.5 py-0.5">
            {c.badge}
          </span>
        )}
      </div>
      <div className="px-1 flex items-center gap-1">
        <Link
          href={`/admin/categories/${c.id}/edit`}
          className="admin-icon-btn rounded p-1.5 text-muted"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <DeleteCategoryButton
          categoryId={c.id}
          categoryName={c.name}
          productCount={c._count.products}
          childCount={childCount}
        />
      </div>
    </article>
  );
}
