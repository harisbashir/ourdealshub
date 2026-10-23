import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FeaturedBanners } from "@/components/FeaturedBanners";
import { ProductGrid } from "@/components/ProductGrid";
import {
  getTrendingProducts,
  getRecentProducts,
} from "@/lib/product-query";
import { parseMarketplaceFilter } from "@/lib/marketplace";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type Props = {
  searchParams: Promise<{ market?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = parseMarketplaceFilter(sp.market);
  const marketQs = market ? `?market=${market}` : "";

  const [featuredCategories, trending, recent] = await Promise.all([
    prisma.category.findMany({
      where: { featured: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: { name: true, slug: true, icon: true, imageUrl: true, badge: true },
    }),
    getTrendingProducts(12, market),
    getRecentProducts(12, market),
  ]);

  const recentCards = recent.map(
    ({ id, title, slug, imageUrl, affiliateUrl, marketplace }) => ({
      id,
      title,
      slug,
      imageUrl,
      affiliateUrl,
      marketplace,
    })
  );
  const hasPicks = recentCards.length > 0;

  return (
    <>
      <h1 className="sr-only">OurDealsHub — curated Amazon picks</h1>

      {!hasPicks ? (
        <section className="site-container pt-8">
          <div className="rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border-subtle">
            <h2 className="text-xl font-semibold text-foreground">
              {market ? `No ${market} picks yet` : "New picks are on the way"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
              {market
                ? "Switch to all stores to see every pick so far."
                : "The first products are being added. Browse categories in the meantime."}
            </p>
            <Link
              href={market ? "/?market=all" : "/browse"}
              className="pressable mt-6 inline-flex h-11 items-center rounded-full bg-brand px-6 text-[15px] font-semibold text-on-brand hover:bg-brand-dark"
            >
              {market ? "Show All Stores" : "Browse Categories"}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <ProductGrid
            title="New"
            subtitle="Just added"
            products={recentCards}
            viewAllHref={`/deals/just-added${marketQs}`}
            layout="carousel"
            priorityCount={2}
          />
          {trending.length > 0 && (
            <ProductGrid
              title="Trending"
              subtitle="What people are opening most"
              products={trending}
              viewAllHref={`/deals/trending${marketQs}`}
              layout="carousel"
            />
          )}
        </>
      )}

      <FeaturedBanners categories={featuredCategories} marketQs={marketQs} />

      {hasPicks && (
        <div className="site-container pt-8">
          <Link
            href={`/deals/all${marketQs}`}
            className="pressable flex h-12 items-center justify-center rounded-full bg-card text-[15px] font-semibold text-foreground ring-1 ring-border hover:bg-card-muted"
          >
            See Every Pick
          </Link>
        </div>
      )}
    </>
  );
}
