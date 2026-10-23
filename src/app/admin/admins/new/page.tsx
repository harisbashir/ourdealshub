import { createAdminUser, assertSuperAdminPage } from "@/lib/admin-actions";

export const metadata = { title: "Add Admin — Super Admin" };

const fieldClass =
  "w-full rounded-lg border border-brand/40 bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-1 focus:ring-brand/25";

export default async function NewAdminPage() {
  await assertSuperAdminPage();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-2">Add admin</h1>
      <p className="text-sm text-muted mb-6">
        Give them a display name (shown as “Added by” on products), email, and
        password. Grant product access so they can add deals.
      </p>

      <form
        action={createAdminUser}
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
            placeholder="e.g. Ali, Sarah, Marketing Team"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Password (min 10 characters)
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={10}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Amazon Tracking ID (US){" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            name="amazonTrackingId"
            type="text"
            maxLength={64}
            placeholder="e.g. admin2-20"
            pattern="[A-Za-z0-9][A-Za-z0-9-]{1,62}"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-muted">
            Associates tag for amazon.com. Applied automatically on US imports.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Amazon Tracking ID (UK){" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            name="amazonTrackingIdUk"
            type="text"
            maxLength={64}
            placeholder="e.g. admin2uk-21"
            pattern="[A-Za-z0-9][A-Za-z0-9-]{1,62}"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-muted">
            Separate tag from Amazon.co.uk for UK deals.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="canManageProducts"
            defaultChecked
            className="rounded border-brand/50 text-brand focus:ring-brand"
          />
          Allow product / deal management
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark"
        >
          Create admin
        </button>
      </form>
    </div>
  );
}
