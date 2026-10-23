/**
 * Local preview products only — not for production catalog.
 * Usage: node scripts/seed-demo-products.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PLACEHOLDER = "/product-placeholder.svg";

const demos = [
  {
    title: "Anker USB-C Fast Charger 65W",
    slug: "demo-anker-usb-c-65w",
    description:
      "Compact GaN wall charger with USB-C for laptops and phones.\n\n• 65W USB-C output for everyday charging\n• Foldable plug for travel bags\n• Works with USB-C laptops, tablets, and phones\n\nCheck current details and availability on Amazon.",
    asin: "B09LQH1R8Z",
    categorySlug: "electronics-tech",
    isTrending: true,
    isFeatured: true,
    marketplace: "US",
    clickCount: 42,
  },
  {
    title: "Echo Dot (5th Gen) Smart Speaker",
    slug: "demo-echo-dot-5th-gen",
    description:
      "Small smart speaker with Alexa voice control and improved sound.\n\n• Voice control for music and timers\n• Compact design for desks and kitchens\n• Easy Wi‑Fi setup\n\nSee full specs and availability on Amazon.",
    asin: "B09B8V1LZ3",
    categorySlug: "electronics-tech",
    isTrending: true,
    isFeatured: false,
    marketplace: "US",
    clickCount: 28,
  },
  {
    title: "Instant Pot Duo 7-in-1 Pressure Cooker",
    slug: "demo-instant-pot-duo",
    description:
      "Multi-cooker for pressure cooking, slow cooking, sauté, and more.\n\n• Several cooking modes in one pot\n• Stainless steel inner pot\n• Handy for meal prep nights\n\nConfirm size and features on Amazon before buying.",
    asin: "B00FLYWNYQ",
    categorySlug: "home-kitchen",
    isTrending: false,
    isFeatured: true,
    marketplace: "US",
    clickCount: 19,
  },
  {
    title: "Ninja Air Fryer Compact",
    slug: "demo-ninja-air-fryer",
    description:
      "Countertop air fryer for crisping favorites with less oil.\n\n• Compact footprint for smaller kitchens\n• Easy-clean basket\n• Straightforward temperature controls\n\nCheck capacity and current listing on Amazon.",
    asin: "B07FDJMC9Q",
    categorySlug: "home-kitchen",
    isTrending: true,
    isFeatured: false,
    marketplace: "US",
    clickCount: 33,
  },
  {
    title: "Phillips Norelco Electric Shaver",
    slug: "demo-norelco-shaver",
    description:
      "Electric shaver designed for a close everyday shave.\n\n• Multi-blade system\n• Cordless convenience\n• Pop-up trimmer for edges\n\nReview model details on Amazon.",
    asin: "B01N1RR7XN",
    categorySlug: "health-beauty",
    isTrending: false,
    isFeatured: false,
    marketplace: "US",
    clickCount: 11,
  },
  {
    title: "Amazon Basics Backpack",
    slug: "demo-amazon-basics-backpack",
    description:
      "Everyday backpack with padded straps and a laptop sleeve.\n\n• Multiple compartments\n• Comfortable shoulder straps\n• Suitable for school or commuting\n\nSee colors and size options on Amazon.",
    asin: "B01IEYGULM",
    categorySlug: "fashion-accessories",
    isTrending: false,
    isFeatured: true,
    marketplace: "US",
    clickCount: 15,
  },
];

async function main() {
  const admin = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { id: true, amazonTrackingId: true },
  });
  if (!admin) throw new Error("No Super Admin found — run npm run db:seed first.");

  const tag = admin.amazonTrackingId?.trim() || "OurDealsHub-20";

  const cats = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, slug: true },
  });
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  let created = 0;
  for (const d of demos) {
    const categoryId = bySlug[d.categorySlug];
    if (!categoryId) {
      console.warn("Skip (missing category):", d.categorySlug, d.slug);
      continue;
    }
    const affiliateUrl = `https://www.amazon.com/dp/${d.asin}?tag=${encodeURIComponent(tag)}`;
    await prisma.product.upsert({
      where: { slug: d.slug },
      create: {
        title: d.title,
        slug: d.slug,
        description: d.description,
        dealPost: d.description,
        imageUrl: PLACEHOLDER,
        affiliateUrl,
        trackingId: tag,
        marketplace: d.marketplace,
        asin: d.asin,
        categoryId,
        createdById: admin.id,
        isTrending: d.isTrending,
        isFeatured: d.isFeatured,
        isPublished: true,
        linkStatus: "unknown",
        clickCount: d.clickCount,
        couponCode: null,
      },
      update: {
        title: d.title,
        description: d.description,
        dealPost: d.description,
        imageUrl: PLACEHOLDER,
        affiliateUrl,
        trackingId: tag,
        isTrending: d.isTrending,
        isFeatured: d.isFeatured,
        isPublished: true,
        deletedAt: null,
        clickCount: d.clickCount,
      },
    });
    created += 1;
    console.log("OK", d.slug);
  }

  console.log(`\nSeeded ${created} demo products. Open http://localhost:3000`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
