import { associatesClaimError } from "@/lib/associates-claims";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_OPTIONS, MARKETPLACES } from "@/lib/marketplace";

const PICKS = [
  { name: "Compact USB-C charger", kind: "charger", category: "electronics-tech", description: "A small charging companion for a calmer desk and a lighter travel bag." },
  { name: "Everyday over-ear headphones", kind: "headphones", category: "electronics-tech", description: "A comfortable listening setup for work breaks, playlists and quiet afternoons." },
  { name: "Insulated everyday bottle", kind: "bottle", category: "home-kitchen", description: "A simple refillable bottle for your desk, day bag and daily routine." },
  { name: "Minimal desk lamp", kind: "lamp", category: "home-kitchen", description: "Focused light and a clean silhouette for a considered workspace." },
];

/** Idempotent preview data. No real ASINs, commissions, fake clicks or API calls. */
export async function addDemoCatalog(adminId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can add samples.");
  let added = 0;
  for (const market of MARKETPLACE_OPTIONS) {
    for (const pick of PICKS) {
      const slug = `sample-${market.toLowerCase()}-${pick.kind}`;
      if (await prisma.product.findUnique({ where: { slug } })) continue;
      const category = await prisma.category.findUnique({ where: { slug: pick.category } }) || await prisma.category.findFirst({ orderBy: { sortOrder: "asc" } });
      if (!category) throw new Error("Add a category before creating the sample catalog.");
      const copyError = associatesClaimError({ title: pick.name, description: pick.description });
      if (copyError) throw new Error(copyError);
      await prisma.product.create({ data: {
        slug, title: pick.name, description: `${pick.description}\n\nThis is a sample listing for exploring the site. The illustration is original placeholder artwork, not a product photograph. It is not an offer and does not link to a product for sale.`,
        imageUrl: `/demo/${pick.kind}.svg`, affiliateUrl: `https://${MARKETPLACES[market].marketplaceHost}/`,
        marketplace: market, categoryId: category.id, createdById: adminId, isDemo: true,
        isPublished: true, isFeatured: true, isTrending: true, asin: null, trackingId: null, clickCount: 0,
      } });
      added++;
    }
  }
  return added;
}
export async function removeDemoCatalog() {
  return (await prisma.product.deleteMany({ where: { isDemo: true } })).count;
}
