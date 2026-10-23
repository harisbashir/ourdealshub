import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { canAccessProducts, isSuperAdmin } from "@/lib/permissions";
import { AdminNav, type AdminNavKey } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell min-h-screen">
      <AdminChrome>{children}</AdminChrome>
    </div>
  );
}

async function AdminChrome({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    return <>{children}</>;
  }

  const superAdmin = isSuperAdmin(session.user);
  const products = canAccessProducts(session.user);
  const email = session.user.email || "Admin";

  const links: {
    href: string;
    label: string;
    key: AdminNavKey;
    show: boolean;
    external?: boolean;
  }[] = [
    { href: "/admin", label: "Dashboard", key: "dashboard", show: true },
    {
      href: "/admin/products",
      label: "Products",
      key: "products",
      show: products,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      key: "analytics",
      show: products,
    },
    {
      href: "/admin/insights",
      label: "Insights",
      key: "insights",
      show: products,
    },
    {
      href: "/admin/categories",
      label: "Categories",
      key: "categories",
      show: superAdmin,
    },
    {
      href: "/admin/blog",
      label: "Blog",
      key: "blog",
      show: superAdmin,
    },
    { href: "/admin/admins", label: "Admins", key: "admins", show: superAdmin },
    {
      href: "/admin/automation",
      label: "Automation",
      key: "automation",
      show: superAdmin,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      key: "settings",
      show: superAdmin,
    },
    {
      href: "/",
      label: "View site",
      key: "site",
      show: true,
      external: true,
    },
  ];

  const visible = links
    .filter((l) => l.show)
    .map(({ href, label, key, external }) => ({ href, label, key, external }));

  return (
    <>
      <header className="admin-header sticky top-0 z-40 border-b border-border backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm shadow-brand/30">
                OD
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground leading-tight">
                  OurDealsHub
                </span>
                <span className="block text-[11px] font-medium text-muted leading-tight">
                  Admin console
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <ThemeToggle compact />
              <div className="hidden sm:flex flex-col items-end min-w-0 gap-1">
                <span className="text-xs font-semibold text-foreground truncate max-w-[12rem]">
                  {email}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
                    superAdmin
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border bg-card-muted text-muted"
                  }`}
                >
                  {superAdmin ? "Super Admin" : "Admin"}
                </span>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs sm:text-sm font-medium text-muted hover:border-brand hover:text-brand transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>

          <div className="pb-3">
            <AdminNav items={visible} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        {children}
      </main>
    </>
  );
}
