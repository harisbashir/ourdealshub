import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  assertSuperAdminPage,
} from "@/lib/admin-actions";
import { updateAdminUserForm } from "@/lib/form-actions";
import { ActionForm } from "@/components/admin/ActionForm";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Admin — Super Admin" };

const fieldClass =
  "w-full rounded-lg border border-brand/40 bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-1 focus:ring-brand/25";

export default async function EditAdminPage({ params }: Props) {
  const current = await assertSuperAdminPage();
  const { id } = await params;
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) notFound();

  // Only allow editing another Super Admin if it's yourself (name/password)
  if (admin.role === "SUPER_ADMIN" && admin.id !== current.id) notFound();

  const action = updateAdminUserForm.bind(null, admin.id);
  const isSelf = admin.id === current.id;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {isSelf ? "Edit your profile" : "Edit admin"}
      </h1>
      <ActionForm
        action={action}
        className="space-y-5 rounded-xl bg-card border border-brand/45 p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Display name
          </label>
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            defaultValue={admin.name}
            placeholder="Shown as Added by on products"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            value={admin.email}
            disabled
            className="w-full rounded-lg border border-brand/30 bg-card-muted px-3 py-2.5 text-sm text-muted"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            New password (leave blank to keep)
          </label>
          <input
            name="password"
            type="password"
            minLength={10}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Amazon Tracking ID (US)
          </label>
          <input
            name="amazonTrackingId"
            type="text"
            maxLength={64}
            defaultValue={admin.amazonTrackingId || ""}
            placeholder="e.g. admin2-20"
            pattern="[A-Za-z0-9][A-Za-z0-9-]{1,62}"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-muted">
            Used for amazon.com deals. Clear and save to remove.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Amazon Tracking ID (UK)
          </label>
          <input
            name="amazonTrackingIdUk"
            type="text"
            maxLength={64}
            defaultValue={admin.amazonTrackingIdUk || ""}
            placeholder="e.g. admin2uk-21"
            pattern="[A-Za-z0-9][A-Za-z0-9-]{1,62}"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-muted">
            Separate Associates tag from Amazon.co.uk. Required before UK
            imports.
          </p>
        </div>
        {!isSelf && (
          <>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="canManageProducts"
                defaultChecked={admin.canManageProducts}
                className="rounded border-brand/50 text-brand focus:ring-brand"
              />
              Allow product / deal management
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={admin.isActive}
                className="rounded border-brand/50 text-brand focus:ring-brand"
              />
              Active (can log in)
            </label>
          </>
        )}
        <button
          type="submit"
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark"
        >
          Save changes
        </button>
      </ActionForm>
    </div>
  );
}
