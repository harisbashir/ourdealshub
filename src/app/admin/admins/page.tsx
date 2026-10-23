import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const metadata = { title: "Admins — Super Admin" };

export default async function AdminsPage() {
  const current = await assertSuperAdminPage();

  const admins = await prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      canManageProducts: true,
      amazonTrackingId: true,
      amazonTrackingIdUk: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admins</h1>
          <p className="text-sm text-muted mt-1">
            Each admin’s US / UK Amazon Tracking IDs are used automatically when
            they add deals. Display names appear as “Added by” on products.
          </p>
        </div>
        <Link
          href="/admin/admins/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-dark shadow-sm shadow-brand/20"
        >
          <Plus className="h-4 w-4" /> Add admin
        </Link>
      </div>

      <AdminUsersTable
        currentUserId={current.id}
        admins={admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          isActive: a.isActive,
          canManageProducts: a.canManageProducts,
          amazonTrackingId: a.amazonTrackingId,
          amazonTrackingIdUk: a.amazonTrackingIdUk,
          createdAt: a.createdAt.toISOString(),
          productCount: a._count.products,
        }))}
      />
    </div>
  );
}
