import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Associates-safe seed: admin + category structure only.
 * No sample products, Unsplash “product” images, prices, coupons,
 * or savings claims — those must come from real Amazon PA-API imports.
 */
async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    throw new Error(
      "[seed] Refusing to run in production (wipes catalog). Set ALLOW_PROD_SEED=1 only if you really mean it."
    );
  }

  const email = process.env.ADMIN_EMAIL || "admin@OurDealsHub.com";
  let password = process.env.ADMIN_PASSWORD?.trim() || "";
  let generatedPassword = false;
  const weak = ["admin123", "change-me", "password", "password123", ""];
  if (!password || weak.includes(password.toLowerCase())) {
    // Dev-safe random password if env missing/weak
    password = `odh-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
    generatedPassword = true;
    console.warn(
      "[seed] ADMIN_PASSWORD missing or weak — generated a temporary password. Set ADMIN_PASSWORD in .env and re-seed, or change it under Admins after login."
    );
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[seed] Temporary password (dev only): ${password}`);
    }
  }
  const passwordHash = await bcrypt.hash(password, 12);

  // Wipe is always opt-in — re-running the seed must never silently delete deals.
  if (process.env.SEED_WIPE === "1") {
    await prisma.clickEvent.deleteMany();
    await prisma.product.deleteMany();
    // Category.parent is onDelete: Restrict — remove subcategories first
    await prisma.category.deleteMany({ where: { parentId: { not: null } } });
    await prisma.category.deleteMany();
  } else {
    console.warn(
      "[seed] Skipping wipe (set SEED_WIPE=1 to clear products/categories)."
    );
  }

  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      name: process.env.ADMIN_NAME || "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      canManageProducts: true,
      ...(process.env.AMAZON_PARTNER_TAG?.trim()
        ? { amazonTrackingId: process.env.AMAZON_PARTNER_TAG.trim() }
        : {}),
    },
    create: {
      email,
      name: process.env.ADMIN_NAME || "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      canManageProducts: true,
      amazonTrackingId: process.env.AMAZON_PARTNER_TAG?.trim() || null,
    },
  });

  const categories = await Promise.all(
    [
      {
        name: "Trending",
        slug: "trending",
        icon: "flame",
        sortOrder: 0,
        featured: false,
        description: "Popular picks from OurDealsHub",
        imageUrl: null as string | null,
      },
      {
        name: "Electronics & Tech",
        slug: "electronics-tech",
        icon: "cpu",
        sortOrder: 1,
        featured: true,
        description: "Electronics and gadgets on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
      },
      {
        name: "Home & Kitchen",
        slug: "home-kitchen",
        icon: "home",
        sortOrder: 2,
        featured: true,
        description: "Home and kitchen products on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800&q=80",
      },
      {
        name: "Fashion & Accessories",
        slug: "fashion-accessories",
        icon: "shirt",
        sortOrder: 3,
        featured: true,
        description: "Fashion and accessories on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
      },
      {
        name: "Health & Beauty",
        slug: "health-beauty",
        icon: "heart",
        sortOrder: 4,
        featured: true,
        description: "Health and beauty products on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
      },
      {
        name: "Toys & Games",
        slug: "toys-games",
        icon: "gamepad",
        sortOrder: 5,
        featured: false,
        description: "Toys and games on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&q=80",
      },
      {
        name: "Sports & Outdoors",
        slug: "sports-outdoors",
        icon: "bike",
        sortOrder: 6,
        featured: false,
        description: "Sports and outdoors on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
      },
      {
        name: "Books & Media",
        slug: "books-media",
        icon: "book",
        sortOrder: 7,
        featured: false,
        description: "Books and media on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
      },
      {
        name: "Pet Supplies",
        slug: "pet-supplies",
        icon: "paw",
        sortOrder: 8,
        featured: false,
        description: "Pet supplies on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
      },
      {
        name: "Baby & Kids",
        slug: "baby-kids",
        icon: "baby",
        sortOrder: 9,
        featured: false,
        description: "Baby and kids products on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
      },
      {
        name: "Automotive",
        slug: "automotive",
        icon: "car",
        sortOrder: 10,
        featured: false,
        description: "Automotive products on Amazon",
        imageUrl:
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
      },
    ].map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: {
          ...c,
          badge: null,
        },
      })
    )
  );

  const electronics = categories.find((c) => c.slug === "electronics-tech");
  if (electronics) {
    await prisma.category.upsert({
      where: { slug: "electronics-tech-cables-chargers" },
      update: {},
      create: {
        name: "Cables & Chargers",
        slug: "electronics-tech-cables-chargers",
        icon: "cpu",
        sortOrder: 0,
        parentId: electronics.id,
        badge: null,
        imageUrl: null,
        description: "Cables and chargers on Amazon",
      },
    });
  }

  // Create only — never overwrite settings an admin has customised.
  // Empty prompt = built-in JSON prompt (getDefaultGeminiPrompt in src/lib/gemini.ts).
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      autoPublish: false,
      geminiPromptTemplate: "",
    },
  });

  console.log(
    `Seed complete. ${categories.length} main categories ensured (existing deals untouched).`
  );
  console.log(
    generatedPassword
      ? `Admin email: ${email} (use the temporary password logged above, then change it)`
      : `Admin email: ${email} (password from ADMIN_PASSWORD in .env — not printed)`
  );
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
