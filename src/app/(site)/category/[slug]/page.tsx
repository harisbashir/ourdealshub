import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";
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
      title: "Trending Deals",
      description: "Most clicked Amazon deals on OurDealsHub right now.",
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
    title: `${title} Deals`,
    description:
      category.description ||
      `Browse curated Amazon ${title} deals on OurDealsHub.`,
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
          subtitle={
            market
              ? `Most clicked · Amazon ${market} · ${total} total`
              : `Most clicked deals right now · ${total} total`
          }
          products={products}
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

  const title = category.parent
    ? `${category.parent.name} › ${category.name}`
    : category.name;
  const pages = totalPages(total);
  const extraQuery = market ? { market } : undefined;

  return (
    <div>
      {!category.parentId && category.children.length > 0 && (
        <div className="site-container pt-6">
          <p className="text-xs font-medium text-muted mb-2">Subcategories</p>
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${child.slug}${market ? `?market=${market}` : ""}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-brand hover:text-brand"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {category.parent && (
        <div className="site-container pt-6 text-sm text-muted">
          <Link
            href={`/category/${category.parent.slug}${market ? `?market=${market}` : ""}`}
            className="hover:text-brand"
          >
            ← {category.parent.name}
          </Link>
        </div>
      )}
      <ProductGrid
        title={title}
        subtitle={
          (category.description ||
            (category.parentId
              ? `Deals in ${category.name}`
              : `All deals in ${category.name}${
                  category.children.length
                    ? " and its subcategories"
                    : ""
                }`)) + (market ? ` · Amazon ${market}` : "")
        }
        products={products}
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
