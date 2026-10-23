import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/ProductGrid";
import { SiteSearch } from "@/components/SiteSearch";
import { Pagination } from "@/components/Pagination";
import { CategoryIcon } from "@/components/CategoryIcon";
import { publicProductWhere, marketplaceWhere, productCardSelect } from "@/lib/product-query";
import { parseMarketplaceFilter } from "@/lib/marketplace";
import { PUBLIC_PAGE_SIZE, parsePage, totalPages } from "@/lib/pagination";

type Props = {
  searchParams: Promise<{ q?: string; page?: string; market?: string }>;
};

export const metadata = {
  title: "Search",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = (sp.q || "").trim().slice(0, 100);
  const market = parseMarketplaceFilter(sp.market);
  const page = parsePage(sp.page);

  const where = query
    ? publicProductWhere({
        AND: [
          {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { dealPost: { contains: query, mode: "insensitive" } },
              { asin: { equals: query.toUpperCase() } },
            ],
          },
          ...(marketplaceWhere(market) ? [marketplaceWhere(market)!] : []),
        ],
      })
    : null;

  const [total, products, suggestions] = await Promise.all([
    where ? prisma.product.count({ where }) : Promise.resolve(0),
    where
      ? prisma.product.findMany({
          where,
          orderBy: [{ clickCount: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * PUBLIC_PAGE_SIZE,
          take: PUBLIC_PAGE_SIZE,
          select: productCardSelect,
        })
      : Promise.resolve([]),
    prisma.category.findMany({
      where: { parentId: null, NOT: { slug: "trending" } },
      orderBy: { sortOrder: "asc" },
      take: 8,
      select: { name: true, slug: true, icon: true },
    }),
  ]);

  const extraQuery: Record<string, string> = {};
  if (query) extraQuery.q = query;
  if (market) extraQuery.market = market;

  return (
    <div>
      <div className="site-container pt-4">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
          Search
        </h1>
        <div className="mt-3 max-w-xl">
          <SiteSearch initialQuery={query} autoFocus={!query} size="lg" />
        </div>
      </div>

      {query ? (
        <>
          <ProductGrid
            title={`Results for “${query}”`}
            subtitle={`${total} ${total === 1 ? "pick" : "picks"}${market ? ` · Amazon ${market}` : ""}`}
            products={products}
            emptyText="No picks match that search. Try a shorter word, or browse a category below."
          />
          <Pagination basePath="/search" page={page} totalPages={totalPages(total)} extraQuery={extraQuery} />
        </>
      ) : null}

      {(!query || total === 0) && suggestions.length > 0 && (
        <section className="site-container pt-8" aria-labelledby="suggest-heading">
          <h2 id="suggest-heading" className="text-[17px] font-semibold text-foreground">
            Browse Categories
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-card px-4 text-[15px] font-medium text-foreground ring-1 ring-border hover:bg-card-muted"
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
