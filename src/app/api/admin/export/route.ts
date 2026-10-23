import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/admin-auth";
import { canAccessProducts, isSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  clampAnalyticsDays,
  getClickAnalytics,
} from "@/lib/click-analytics";
import { csvEscape } from "@/lib/csv";

export const dynamic = "force-dynamic";

function csvResponse(filename: string, header: string[], rows: string[][]) {
  const body = [header.map(csvEscape).join(",")]
    .concat(rows.map((r) => r.map(csvEscape).join(",")))
    .join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** GET /api/admin/export?type=products|analytics&days=14 */
export async function GET(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin || !canAccessProducts(admin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "products";
  const daysRaw = url.searchParams.get("days") || "14";
  const days = clampAnalyticsDays(daysRaw);
  const ownerFilter = isSuperAdmin(admin)
    ? undefined
    : { ownerAdminId: admin.id };

  if (type === "analytics") {
    const data = await getClickAnalytics(days, ownerFilter);
    const rows = data.clicksByDay.map((d) => [d.day, String(d.count)]);
    const prodRows = data.topProducts.map((p) => [
      p.title,
      p.categoryName,
      p.adminName,
      String(p.count),
    ]);
    const body = [
      "section,key,value",
      ...rows.map(([day, count]) =>
        ["day", day, count].map(csvEscape).join(",")
      ),
      ...prodRows.map(([title, cat, adminName, count]) =>
        ["product", title, count, cat, adminName].map(csvEscape).join(",")
      ),
      ["kpi", "totalClicks", String(data.totalClicks)]
        .map(csvEscape)
        .join(","),
      ["kpi", "avgPerDay", String(data.avgPerDay)].map(csvEscape).join(","),
      ["kpi", "deltaPct", String(data.deltaPct)].map(csvEscape).join(","),
    ].join("\n");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${days}d.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(isSuperAdmin(admin) ? {} : { createdById: admin.id }),
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      title: true,
      slug: true,
      asin: true,
      isPublished: true,
      clickCount: true,
      linkStatus: true,
      affiliateUrl: true,
      category: { select: { name: true } },
      createdAt: true,
    },
  });

  return csvResponse(
    "products.csv",
    [
      "title",
      "slug",
      "asin",
      "category",
      "published",
      "clicks",
      "linkStatus",
      "affiliateUrl",
      "createdAt",
    ],
    products.map((p) => [
      p.title,
      p.slug,
      p.asin || "",
      p.category.name,
      p.isPublished ? "yes" : "no",
      String(p.clickCount),
      p.linkStatus,
      p.affiliateUrl,
      p.createdAt.toISOString(),
    ])
  );
}
