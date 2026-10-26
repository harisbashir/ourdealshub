import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";
import { marketplaceLabel } from "@/lib/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Original typographic artwork. Never fetch, download or embed Amazon images. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || slug.length > 200) return new Response("Not found", { status: 404 });
  const deal = await prisma.product.findFirst({ where: publicProductWhere({ slug }), select: { title: true, marketplace: true, isDemo: true, category: { select: { name: true } } } });
  if (!deal) return new Response("Not found", { status: 404 });
  const artwork = new ImageResponse(h("div", { style: { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 86, background: "#f7f4ee", color: "#212320", fontFamily: "sans-serif" } },
    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, fontWeight: 700 } }, h("div", { style: { display: "flex" } }, "OurDealsHub"), h("div", { style: { display: "flex", color: "#64675d", fontSize: 24 } }, deal.isDemo ? "SAMPLE" : "EDITORIAL PICK")),
    h("div", { style: { display: "flex", flexDirection: "column", gap: 36 } },
      h("div", { style: { display: "flex", fontSize: 28, color: "#64675d" } }, `${deal.category.name} · ${marketplaceLabel(deal.marketplace)}`),
      h("div", { style: { display: "flex", fontSize: 82, lineHeight: 1.08, letterSpacing: -3, fontWeight: 700 } }, deal.title.slice(0, 150)),
      h("div", { style: { display: "flex", width: 120, height: 8, marginTop: 24, borderRadius: 4, background: "#d06737" } }),
      h("div", { style: { display: "flex", fontSize: 34, color: "#64675d" } }, "Thoughtful finds for everyday life.")),
    h("div", { style: { display: "flex", flexDirection: "column", gap: 20, fontSize: 24, color: "#64675d" } },
      h("div", { style: { display: "flex", fontWeight: 700 } }, "#ad · Affiliate pick"),
      h("div", { style: { display: "flex" } }, "As an Amazon Associate I earn from qualifying purchases."))
  ), { width: 1200, height: 1500 });
  const jpeg = await sharp(Buffer.from(await artwork.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
