import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productCardSelect, publicProductWhere } from "@/lib/product-query";

export const dynamic = "force-dynamic";

/**
 * Current card data for the slugs in a visitor's Saved list (stored only in
 * their browser). Only live public picks come back; the client drops the rest.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("slugs") || "";
  const slugs = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]{1,200}$/.test(s))
    )
  ).slice(0, 200);
  if (!slugs.length) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: publicProductWhere({ slug: { in: slugs } }),
    select: productCardSelect,
  });
  // Keep the visitor's order (most recently saved first)
  const order = new Map(slugs.map((s, i) => [s, i]));
  products.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } }
  );
}
