import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import {
  publicProductWhere,
  getTrendingProducts,
  marketplaceWhere,
} from "@/lib/product-query";
import { categoryProductFilter } from "@/lib/category-resolve";
import { parseMarketplaceFilter } from "@/lib/marketplace";
import {
  PUBLIC_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/pagination";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; market?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (slug === "trending") {
    return {
      title: "Trending",
      description: "The Amazon picks people are opening most on OurDealsHub right now.",
      alternates: { canonical: "/category/trending" },
    };
  }
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { parent: true },
  });
  if (!category) return { title: "Category" };
  const title = category.parent
    ? `${category.parent.name} › ${category.name}`
    : category.name;
  return {
    title,
    description:
      category.description ||
      `Curated Amazon picks in ${title} on OurDealsHub.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const market = parseMarketplaceFilter(sp.market);

  if (slug === "trending") {
    const where = publicProductWhere(marketplaceWhere(market));
    const skip = (page - 1) * PUBLIC_PAGE_SIZE;
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      getTrendingProducts(PUBLIC_PAGE_SIZE, market, skip),
    ]);
    const pages = totalPages(total);
    const extraQuery = market ? { market } : undefined;
    return (
      <div>
        <ProductGrid
          title="Trending"
          subtitle={`What people are opening most${market ? ` · Amazon ${market}` : ""} · ${total} ${total === 1 ? "pick" : "picks"}`}
          products={products}
          headingLevel={1}
          priorityCount={4}
        />
        <Pagination
          basePath={"/category/trending"}
          page={page}
          totalPages={pages}
          extraQuery={extraQuery}
        />
      </div>
    );
  }

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
  if (!category) notFound();

  const where = publicProductWhere({
    AND: [
      categoryProductFilter(category),
      ...(marketplaceWhere(market) ? [marketplaceWhere(market)!] : []),
    ],
  });
  const [total, products] = await Promise.all([
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
  ]);

  const pages = totalPages(total);
  const extraQuery = market ? { market } : undefined;

  return (
    <div>
      {category.parent && (
        <div className="site-container pt-4">
          <Link
            href={`/category/${category.parent.slug}${market ? `?market=${market}` : ""}`}
            className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[15px] font-medium text-brand hover:bg-brand-soft"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {category.parent.name}
          </Link>
        </div>
      )}
      <ProductGrid
        title={category.name}
        subtitle={
          (category.description ||
            (category.children.length
              ? `Everything in ${category.name}, including subcategories`
              : `Picks in ${category.name}`)) +
          (market ? ` · Amazon ${market}` : "") +
          ` · ${total} ${total === 1 ? "pick" : "picks"}`
        }
        products={products}
        headingLevel={1}
        priorityCount={4}
        headerExtra={
          !category.parentId && category.children.length > 0 ? (
            <nav aria-label="Subcategories">
              <ul className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {category.children.map((child) => (
                  <li key={child.id} className="shrink-0">
                    <Link
                      href={`/category/${child.slug}${market ? `?market=${market}` : ""}`}
                      className="pressable inline-flex h-10 items-center rounded-full bg-card px-4 text-[15px] font-medium whitespace-nowrap text-foreground ring-1 ring-border hover:bg-card-muted"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null
        }
        emptyText={
          market
            ? `No ${market} picks in ${category.name} yet. Try all stores.`
            : `No picks in ${category.name} yet. Check back soon.`
        }
      />
      <Pagination
        basePath={`/category/${slug}`}
        page={page}
        totalPages={pages}
        extraQuery={extraQuery}
      />
    </div>
  );
}
