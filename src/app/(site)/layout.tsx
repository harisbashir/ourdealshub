import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { SiteChrome } from "@/components/SiteChrome";
import { CategoryBar } from "@/components/CategoryBar";
import { DisclosureNote } from "@/components/AffiliateDisclosure";
import { prisma } from "@/lib/prisma";
import { getAccentTheme } from "@/lib/settings";

/**
 * Render per request. Every public page reads MariaDB (nav categories at minimum),
 * so build-time prerendering (ISR) would require a live DB during `next build`.
 */
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accent, categories] = await Promise.all([
    getAccentTheme(),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, icon: true },
    }),
  ]);

  return (
    <div data-accent={accent} className="flex min-h-dvh flex-col">
      <SiteChrome />
      <main id="main" className="flex-1">
        <Suspense fallback={null}>
          <CategoryBar categories={categories} />
        </Suspense>
        <DisclosureNote />
        {children}
      </main>
      <div className="with-tab-bar">
        <Footer />
      </div>
    </div>
  );
}
