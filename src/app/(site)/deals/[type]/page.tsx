import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { notFound } from "next/navigation";
import {
  publicProductWhere,
  getTrendingProducts,
  getRecentProducts,
  productCardSelect,
  marketplaceWhere,
} from "@/lib/product-query";
import { parseMarketplaceFilter } from "@/lib/marketplace";
import {
  PUBLIC_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/pagination";

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string; market?: string }>;
};

const CONFIG: Record<
  string,
  {
    title: string;
    subtitle: string;
    filter: "trending" | "just-added" | "all";
  }
> = {
  trending: {
    title: "Trending",
    subtitle: "What people are opening most",
    filter: "trending",
  },
  "just-added": {
    title: "New",
    subtitle: "Just added",
    filter: "just-added",
  },
  all: {
    title: "All Picks",
    subtitle: "Everything on OurDealsHub",
    filter: "all",
  },
};

export async function generateMetadata({ params }: Props) {
  const { type } = await params;
  const conf = CONFIG[type];
  return {
    title: conf?.title || "Deals",
    alternates: conf ? { canonical: `/deals/${type}` } : undefined,
  };
}

export default async function DealsTypePage({ params, searchParams }: Props) {
  const { type } = await params;
  const sp = await searchParams;
  const conf = CONFIG[type];
  if (!conf) notFound();

  const market = parseMarketplaceFilter(sp.market);
  const page = parsePage(sp.page);
  let products;
  let total = 0;
  let pages = 1;

  const where = publicProductWhere(marketplaceWhere(market));
  const skip = (page - 1) * PUBLIC_PAGE_SIZE;

  if (conf.filter === "trending") {
    [total, products] = await Promise.all([
      prisma.product.count({ where }),
      getTrendingProducts(PUBLIC_PAGE_SIZE, market, skip),
    ]);
    pages = totalPages(total);
  } else if (conf.filter === "just-added") {
    const [count, recent] = await Promise.all([
      prisma.product.count({ where }),
      getRecentProducts(PUBLIC_PAGE_SIZE, market, skip),
    ]);
    total = count;
    pages = totalPages(total);
    products = recent.map(
      ({ id, title, slug, imageUrl, affiliateUrl, marketplace, isDemo }) => ({
        id,
        isDemo,
        title,
        slug,
        imageUrl,
        affiliateUrl,
        marketplace,
      })
    );
  } else {
    [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PUBLIC_PAGE_SIZE,
        select: productCardSelect,
      }),
    ]);
    pages = totalPages(total);
  }

  const extraQuery = market ? { market } : undefined;

  return (
    <div>
      <ProductGrid
        title={conf.title}
        subtitle={`${conf.subtitle}${market ? ` · Amazon ${market}` : ""} · ${total} ${total === 1 ? "pick" : "picks"}`}
        products={products}
        layout="grid"
        headingLevel={1}
        priorityCount={4}
      />
      <Pagination
        basePath={`/deals/${type}`}
        page={page}
        totalPages={pages}
        extraQuery={extraQuery}
      />
    </div>
  );
}
