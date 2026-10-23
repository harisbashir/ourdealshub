import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const SKIP_NAMES = new Set([
  "categories",
  "category",
  "products",
  "product",
  "stores",
  "store",
  "departments",
  "department",
  "any department",
  "shop by category",
  "featured categories",
  "amazon.com",
  "all departments",
  "buy",
  "see all",
]);

const MAIN_ICONS: Record<string, string> = {
  electronics: "cpu",
  "electronics & tech": "cpu",
  computers: "cpu",
  "home & kitchen": "home",
  home: "home",
  kitchen: "home",
  fashion: "shirt",
  clothing: "shirt",
  "clothing, shoes & jewelry": "shirt",
  beauty: "heart",
  "health & household": "heart",
  "beauty & personal care": "heart",
  toys: "gamepad",
  "toys & games": "gamepad",
  sports: "bike",
  "sports & outdoors": "bike",
  books: "book",
  pet: "paw",
  "pet supplies": "paw",
  baby: "baby",
  automotive: "car",
  "tools & home improvement": "home",
};

export type CategoryPath = {
  mainName: string;
  subName: string | null;
  path: string[];
};

export type ResolvedCategory = {
  categoryId: string;
  mainName: string;
  subName: string | null;
  label: string;
  created: boolean;
};

function cleanSegment(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function normalizeCategoryPath(rawPath: string[]): CategoryPath | null {
  const path = rawPath
    .map(cleanSegment)
    .filter((n) => n && !SKIP_NAMES.has(n.toLowerCase()));

  if (!path.length) return null;

  const mainName = path[0];
  const leaf = path[path.length - 1];
  const subName =
    path.length > 1 && leaf.toLowerCase() !== mainName.toLowerCase()
      ? leaf
      : null;

  return { mainName, subName, path };
}

async function uniqueCategorySlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `cat-${Date.now().toString(36)}`;
  const clash = await prisma.category.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

async function findMainByName(name: string) {
  const slug = slugify(name);
  return prisma.category.findFirst({
    where: {
      parentId: null,
      NOT: { slug: "trending" },
      OR: [{ name: { equals: name } }, { slug }],
    },
  });
}

async function findSubByName(parentId: string, name: string) {
  const slug = slugify(name);
  return prisma.category.findFirst({
    where: {
      parentId,
      OR: [{ name: { equals: name } }, { slug }, { slug: { endsWith: `-${slug}` } }],
    },
  });
}

/**
 * Find or create main + optional subcategory from Amazon browse path.
 * Products are attached to the leaf (sub if present, else main).
 * Staff admins: allowCreate=false → only match existing categories (no new ones).
 */
export async function resolveOrCreateCategoryFromPath(
  path: CategoryPath,
  opts?: { allowCreate?: boolean }
): Promise<ResolvedCategory | null> {
  const allowCreate = opts?.allowCreate !== false;
  let created = false;
  let main = await findMainByName(path.mainName);

  if (!main) {
    if (!allowCreate) return null;
    const iconKey = path.mainName.toLowerCase();
    const icon =
      MAIN_ICONS[iconKey] ||
      Object.entries(MAIN_ICONS).find(([k]) => iconKey.includes(k))?.[1] ||
      "tag";
    main = await prisma.category.create({
      data: {
        name: path.mainName.slice(0, 120),
        slug: await uniqueCategorySlug(path.mainName),
        icon,
        sortOrder: 50,
        parentId: null,
      },
    });
    created = true;
  }

  if (!path.subName) {
    return {
      categoryId: main.id,
      mainName: main.name,
      subName: null,
      label: main.name,
      created,
    };
  }

  let sub = await findSubByName(main.id, path.subName);
  if (!sub) {
    if (!allowCreate) {
      // Use main category if sub does not exist yet
      return {
        categoryId: main.id,
        mainName: main.name,
        subName: null,
        label: main.name,
        created: false,
      };
    }
    sub = await prisma.category.create({
      data: {
        name: path.subName.slice(0, 120),
        slug: await uniqueCategorySlug(`${main.slug}-${path.subName}`),
        icon: main.icon || "tag",
        sortOrder: 0,
        parentId: main.id,
        featured: false,
      },
    });
    created = true;
  }

  return {
    categoryId: sub.id,
    mainName: main.name,
    subName: sub.name,
    label: `${main.name} › ${sub.name}`,
    created,
  };
}

/** Fallback when Amazon sends no browse nodes. */
export async function resolveFallbackCategoryId(
  preferredId?: string | null
): Promise<ResolvedCategory | null> {
  if (preferredId) {
    const cat = await prisma.category.findUnique({
      where: { id: preferredId },
      include: { parent: true },
    });
    if (cat) {
      return {
        categoryId: cat.id,
        mainName: cat.parent?.name || cat.name,
        subName: cat.parent ? cat.name : null,
        label: cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name,
        created: false,
      };
    }
  }

  const first = await prisma.category.findFirst({
    where: { parentId: null, NOT: { slug: "trending" } },
    orderBy: { sortOrder: "asc" },
  });
  if (!first) return null;
  return {
    categoryId: first.id,
    mainName: first.name,
    subName: null,
    label: first.name,
    created: false,
  };
}

/** Options for admin selects: "Electronics › Cables" */
export async function listCategoryOptions() {
  const mains = await prisma.category.findMany({
    where: { parentId: null, NOT: { slug: "trending" } },
    orderBy: { sortOrder: "asc" },
    include: {
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });

  const options: { id: string; name: string; parentId: string | null }[] = [];
  for (const m of mains) {
    options.push({ id: m.id, name: m.name, parentId: null });
    for (const c of m.children) {
      options.push({
        id: c.id,
        name: `${m.name} › ${c.name}`,
        parentId: m.id,
      });
    }
  }
  return options;
}

/** Product IDs for a main category include all subcategory products. */
export function categoryProductFilter(category: {
  id: string;
  parentId: string | null;
  children?: { id: string }[];
}) {
  if (category.parentId) {
    return { categoryId: category.id };
  }
  const childIds = (category.children || []).map((c) => c.id);
  if (!childIds.length) return { categoryId: category.id };
  return { categoryId: { in: [category.id, ...childIds] } };
}
