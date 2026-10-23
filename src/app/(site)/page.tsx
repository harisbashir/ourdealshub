import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FeaturedBanners } from "@/components/FeaturedBanners";
import { ProductGrid } from "@/components/ProductGrid";
import {
  publicProductWhere,
  getTrendingProducts,
  getRecentProducts,
  productCardSelect,
  marketplaceWhere,
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

  const [featuredCategories, trending, recent, allDeals] = await Promise.all([
    prisma.category.findMany({
      where: { featured: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
    getTrendingProducts(18, market),
    getRecentProducts(18, market),
    prisma.product.findMany({
      where: publicProductWhere(marketplaceWhere(market)),
      orderBy: { createdAt: "desc" },
      take: 21,
      select: productCardSelect,
    }),
  ]);

  const hasAnyDeals = allDeals.length > 0;
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

  const marketQs = market ? `?market=${market}` : "";

  return (
    <>
      <FeaturedBanners categories={featuredCategories} />

      {!hasAnyDeals ? (
        <section className="site-container pt-6 pb-4">
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {market
                ? `No ${market} deals yet`
                : "Deals coming soon"}
            </h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              We&apos;re adding curated Amazon product picks. As an Amazon
              Associate, OurDealsHub earns from qualifying purchases.
            </p>
          </div>
        </section>
      ) : (
        <>
          <ProductGrid
            title="New"
            subtitle={
              market
                ? `Recently added · Amazon ${market}`
                : "Recently added products"
            }
            products={recentCards}
            viewAllHref={`/deals/just-added${marketQs}`}
            layout="carousel"
            icon="sparkles"
          />

          {trending.length > 0 && (
            <ProductGrid
              title="Top Trending"
              subtitle={
                market
                  ? `Most clicked · Amazon ${market}`
                  : "Most clicked picks right now"
              }
              products={trending}
              viewAllHref={`/deals/trending${marketQs}`}
              layout="carousel"
            />
          )}

          <ProductGrid
            title="All Picks"
            subtitle={
              market
                ? `Browse ${market} store picks`
                : "Browse every product on OurDealsHub"
            }
            products={allDeals}
            viewAllHref={`/deals/all${marketQs}`}
            layout="carousel"
            icon="grid"
          />
        </>
      )}
    </>
  );
}
