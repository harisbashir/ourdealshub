import { Footer } from "@/components/Footer";
import { SiteChrome } from "@/components/SiteChrome";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { prisma } from "@/lib/prisma";

/** ISR — public pages refresh periodically; admin mutations still revalidatePath. */
export const revalidate = 60;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Top nav: Trending + main categories only
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ slug: "trending" }, { parentId: null, NOT: { slug: "trending" } }],
    },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true, icon: true, parentId: true },
  });

  const nav = [
    ...categories.filter((c) => c.slug === "trending"),
    ...categories.filter((c) => c.slug !== "trending"),
  ].map(({ name, slug, icon }) => ({ name, slug, icon }));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteChrome categories={nav} />
      <main className="flex-1">{children}</main>
      <AffiliateDisclosure compact />
      <Footer />
    </div>
  );
}
