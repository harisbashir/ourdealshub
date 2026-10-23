import type { Metadata } from "next";
import { auth, signOut } from "@/lib/auth";
import { canAccessProducts, isSuperAdmin } from "@/lib/permissions";
import { AdminNav, type NavGroup } from "@/components/admin/AdminNav";
import { AuthProvider } from "@/components/AuthProvider";
import { getAccentTheme } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | OurDealsHub Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, accent] = await Promise.all([auth(), getAccentTheme()]);

  // Login page (and other signed-out screens) render without chrome
  if (!session?.user) {
    return (
      <div data-accent={accent} className="min-h-dvh">
        <AuthProvider>{children}</AuthProvider>
      </div>
    );
  }

  const superAdmin = isSuperAdmin(session.user);
  const products = canAccessProducts(session.user);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin", label: "Dashboard", key: "dashboard" },
        ...(products
          ? [
              { href: "/admin/products", label: "Products", key: "products" as const },
              { href: "/admin/products/new", label: "Add Deal", key: "add" as const },
            ]
          : []),
      ],
    },
    ...(products
      ? [
          {
            title: "Performance",
            items: [
              { href: "/admin/analytics", label: "Analytics", key: "analytics" as const },
              { href: "/admin/insights", label: "Insights", key: "insights" as const },
            ],
          },
        ]
      : []),
    ...(superAdmin
      ? [
          {
            title: "Site",
            items: [
              { href: "/admin/categories", label: "Categories", key: "categories" as const },
              { href: "/admin/blog", label: "Blog", key: "blog" as const },
              { href: "/admin/automation", label: "Automation", key: "automation" as const },
              { href: "/admin/admins", label: "Admins", key: "admins" as const },
              { href: "/admin/settings", label: "Settings", key: "settings" as const },
            ],
          },
        ]
      : []),
    {
      title: "Support",
      items: [
        { href: "/admin/help", label: "Help", key: "help" },
        { href: "/", label: "View Site", key: "site", external: true },
      ],
    },
  ];

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div data-accent={accent} className="min-h-dvh bg-background">
      <AuthProvider>
        <AdminNav
          groups={groups}
          email={session.user.email || "Admin"}
          roleLabel={superAdmin ? "Super Admin" : "Admin"}
          signOut={doSignOut}
        />
        <main id="main" className="lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</div>
        </main>
      </AuthProvider>
    </div>
  );
}
