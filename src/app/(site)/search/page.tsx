import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/ProductGrid";
import { SiteSearch } from "@/components/SiteSearch";
import { Pagination } from "@/components/Pagination";
import { publicProductWhere, marketplaceWhere } from "@/lib/product-query";
import { parseMarketplaceFilter } from "@/lib/marketplace";
import {
  PUBLIC_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/pagination";

type Props = {
  searchParams: Promise<{ q?: string; page?: string; market?: string }>;
};

export const metadata = {
  title: "Search Deals",
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = (sp.q || "").trim();
  const market = parseMarketplaceFilter(sp.market);
  const page = parsePage(sp.page);

  const where = query
    ? publicProductWhere({
        AND: [
          {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { asin: { contains: query.toUpperCase() } },
              { slug: { contains: query.toLowerCase() } },
            ],
          },
          ...(marketplaceWhere(market) ? [marketplaceWhere(market)!] : []),
        ],
      })
    : null;

  const [total, products] = where
    ? await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PUBLIC_PAGE_SIZE,
          take: PUBLIC_PAGE_SIZE,
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            affiliateUrl: true,
            marketplace: true,
          },
        }),
      ])
    : [0, []];

  const pages = totalPages(total);
  const extraQuery: Record<string, string> = {};
  if (query) extraQuery.q = query;
  if (market) extraQuery.market = market;

  return (
    <div>
      <div className="site-container pt-8 space-y-3">
        <h1 className="text-2xl font-bold text-foreground">Search deals</h1>
        <SiteSearch initialQuery={query} />
      </div>
      <ProductGrid
        title={query ? `Results for “${query}”` : "Enter a search term"}
        subtitle={
          query
            ? `${total} deal${total === 1 ? "" : "s"} found${market ? ` · ${market}` : ""}`
            : undefined
        }
        products={products}
      />
      {query ? (
        <Pagination
          basePath="/search"
          page={page}
          totalPages={pages}
          extraQuery={extraQuery}
        />
      ) : null}
    </div>
  );
}
