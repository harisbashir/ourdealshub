"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Ban, Trash2 } from "lucide-react";
import { deleteAdminUser, revokeAdminAccess } from "@/lib/admin-actions";
import { AdminHScroll } from "@/components/admin/AdminHScroll";

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageProducts: boolean;
  amazonTrackingId: string | null;
  amazonTrackingIdUk: string | null;
  amazonTrackingIdCa: string | null;
  createdAt: string;
  productCount: number;
};

export function AdminUsersTable({
  admins,
  currentUserId,
}: {
  admins: AdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
      <AdminHScroll>
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1.2fr)_auto_minmax(120px,1fr)_auto_auto_auto_auto] gap-x-2 items-center bg-card-muted text-left text-muted text-sm px-3 py-2.5 border-b border-border">
            <span className="px-1 font-medium">Name</span>
            <span className="px-1 font-medium">Email</span>
            <span className="px-1 font-medium">Role</span>
            <span className="px-1 font-medium">Tracking IDs</span>
            <span className="px-1 font-medium">Products</span>
            <span className="px-1 font-medium">Access</span>
            <span className="px-1 font-medium">Status</span>
            <span className="px-1 font-medium">Actions</span>
          </div>

          <div className="space-y-2 p-2.5">
            {admins.map((a) => {
              const isSelf = a.id === currentUserId;
              const canEdit = a.role !== "SUPER_ADMIN" || isSelf;
              const isSuper = a.role === "SUPER_ADMIN";

              return (
                <article
                  key={a.id}
                  className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1.2fr)_auto_minmax(120px,1fr)_auto_auto_auto_auto] gap-x-2 items-center rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <div className="px-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {a.name || "—"}
                    </span>
                    {isSelf && (
                      <span className="ml-1 text-xs text-muted-fg">(you)</span>
                    )}
                  </div>

                  <div className="px-1 text-muted truncate">{a.email}</div>

                  <div className="px-1">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm ${
                        isSuper
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-border bg-card-muted text-muted"
                      }`}
                    >
                      {isSuper ? "Super Admin" : "Admin"}
                    </span>
                  </div>

                  <div className="px-1 font-mono text-xs text-muted truncate">
                    {a.amazonTrackingId || a.amazonTrackingIdUk || a.amazonTrackingIdCa ? (
                      <span className="block truncate">
                        {a.amazonTrackingId ? (
                          <span title="US">US: {a.amazonTrackingId}</span>
                        ) : (
                          <span className="text-warning font-sans">US —</span>
                        )}
                        <br />
                        {a.amazonTrackingIdCa && <span title="Canada">CA: {a.amazonTrackingIdCa}</span>}
                        {a.amazonTrackingIdUk ? (
                          <span title="UK">UK: {a.amazonTrackingIdUk}</span>
                        ) : (
                          <span className="text-warning font-sans">UK —</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-warning font-sans font-medium">
                        Not set
                      </span>
                    )}
                  </div>

                  <div className="px-1 text-muted tabular-nums">
                    {a.productCount}
                  </div>

                  <div className="px-1 text-muted whitespace-nowrap">
                    {isSuper ? "Full" : a.canManageProducts ? "Deals" : "None"}
                  </div>

                  <div className="px-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.isActive
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                      }`}
                    >
                      {a.isActive ? "Active" : "Revoked"}
                    </span>
                  </div>

                  <div className="px-1 flex items-center gap-1">
                    {!canEdit ? (
                      <span className="text-xs text-muted-fg">Protected</span>
                    ) : (
                      <>
                        <Link
                          href={`/admin/admins/${a.id}/edit`}
                          className="admin-icon-btn rounded p-1.5 text-muted"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {!isSelf && !isSuper && (
                          <>
                            <button
                              type="button"
                              title="Revoke access"
                              className="admin-icon-btn rounded p-1.5 text-muted"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Revoke access for ${a.name || a.email}?`
                                  )
                                )
                                  return;
                                await revokeAdminAccess(a.id);
                                router.refresh();
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete admin"
                              className="admin-icon-btn admin-icon-btn--danger rounded p-1.5 text-muted"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Permanently delete admin ${a.name || a.email}?`
                                  )
                                )
                                  return;
                                await deleteAdminUser(a.id);
                                router.refresh();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </AdminHScroll>

      {admins.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">No admins yet.</p>
      )}
    </div>
  );
}
