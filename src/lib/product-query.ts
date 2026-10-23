import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseMarketplace,
  type MarketplaceCode,
} from "@/lib/marketplace";

/** Fields needed by ProductCard / carousels — avoids loading dealPost/description. */
export const productCardSelect = {
  id: true,
  title: true,
  slug: true,
  imageUrl: true,
  affiliateUrl: true,
  marketplace: true,
} satisfies Prisma.ProductSelect;

/** Public storefront: published, not archived, not expired. */
export function publicProductWhere(
  extra?: Prisma.ProductWhereInput
): Prisma.ProductWhereInput {
  const now = new Date();
  return {
    AND: [
      {
        isPublished: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      ...(extra ? [extra] : []),
    ],
  };
}

/** Optional marketplace constraint for public listings. */
export function marketplaceWhere(
  market: MarketplaceCode | null | undefined
): Prisma.ProductWhereInput | undefined {
  if (!market) return undefined;
  return { marketplace: market };
}

/**
 * Top Trending ranking (live):
 * 1. Optional admin pin (`isTrending`) floats to the front
 * 2. Then highest live `clickCount` (updated on every Get Deal click)
 * 3. Then newest as tie-breaker
 */
export const trendingOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
  { isTrending: "desc" },
  { clickCount: "desc" },
  { createdAt: "desc" },
];

export async function getTrendingProducts(
  take = 12,
  market?: MarketplaceCode | null,
  skip = 0
) {
  return prisma.product.findMany({
    where: publicProductWhere(marketplaceWhere(market)),
    orderBy: trendingOrderBy,
    skip,
    take,
    select: productCardSelect,
  });
}

/** Recently published deals for the homepage /deal feed. */
export async function getRecentProducts(
  take = 20,
  market?: MarketplaceCode | null,
  skip = 0
) {
  return prisma.product.findMany({
    where: publicProductWhere(marketplaceWhere(market)),
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      ...productCardSelect,
      createdAt: true,
      category: { select: { name: true, slug: true } },
    },
  });
}

/**
 * Related deals: same marketplace + category first, then same market siblings,
 * then fill from other markets if still short.
 */
export async function getRelatedProducts(opts: {
  productId: string;
  categoryId: string;
  parentCategoryId?: string | null;
  marketplace?: string | null;
  take?: number;
}) {
  const take = opts.take ?? 8;
  const market = parseMarketplace(opts.marketplace);

  const sameCategory = await prisma.product.findMany({
    where: publicProductWhere({
      categoryId: opts.categoryId,
      id: { not: opts.productId },
      marketplace: market,
    }),
    orderBy: trendingOrderBy,
    take,
    select: productCardSelect,
  });

  if (sameCategory.length >= take) return sameCategory;

  const haveIds = new Set(sameCategory.map((p) => p.id));

  if (opts.parentCategoryId) {
    const siblingCats = await prisma.category.findMany({
      where: {
        parentId: opts.parentCategoryId,
        id: { not: opts.categoryId },
      },
      select: { id: true },
    });
    const siblingIds = siblingCats.map((c) => c.id);
    if (siblingIds.length > 0) {
      const need = take - sameCategory.length;
      const siblings = await prisma.product.findMany({
        where: publicProductWhere({
          categoryId: { in: siblingIds },
          id: { not: opts.productId },
          marketplace: market,
        }),
        orderBy: trendingOrderBy,
        take: need + 4,
        select: productCardSelect,
      });
      for (const p of siblings) {
        if (haveIds.has(p.id)) continue;
        sameCategory.push(p);
        haveIds.add(p.id);
        if (sameCategory.length >= take) return sameCategory;
      }
    }
  }

  // Last resort: other markets, same category
  if (sameCategory.length < take) {
    const need = take - sameCategory.length;
    const other = await prisma.product.findMany({
      where: publicProductWhere({
        categoryId: opts.categoryId,
        id: { notIn: [opts.productId, ...haveIds] },
        marketplace: { not: market },
      }),
      orderBy: trendingOrderBy,
      take: need,
      select: productCardSelect,
    });
    sameCategory.push(...other);
  }

  return sameCategory;
}

/** Admin default list: exclude soft-deleted unless archived view. */
export function adminProductWhere(opts: {
  adminId?: string;
  q?: string;
  archived?: boolean;
  marketplace?: MarketplaceCode | null;
}): Prisma.ProductWhereInput {
  const parts: Prisma.ProductWhereInput[] = [
    { deletedAt: opts.archived ? { not: null } : null },
  ];
  if (opts.adminId) parts.push({ createdById: opts.adminId });
  if (opts.marketplace) parts.push({ marketplace: opts.marketplace });
  const q = opts.q?.trim();
  if (q) {
    parts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { asin: { contains: q.toUpperCase() } },
        { slug: { contains: q.toLowerCase() } },
      ],
    });
  }
  return { AND: parts };
}
