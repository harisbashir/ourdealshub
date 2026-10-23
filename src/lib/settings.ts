import { prisma } from "@/lib/prisma";
import { getDefaultGeminiPrompt } from "@/lib/gemini";
import { parseAccent, DEFAULT_ACCENT, type AccentId } from "@/lib/theme";

export type AppSettings = {
  geminiPromptTemplate: string;
  autoPublish: boolean;
  defaultCategoryId: string | null;
  socialAutoPost: boolean;
  accentTheme: AccentId;
};

export async function getSiteSettings(): Promise<AppSettings> {
  let row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.siteSettings.create({
      data: {
        id: "default",
        geminiPromptTemplate: getDefaultGeminiPrompt(),
        autoPublish: false,
        socialAutoPost: true,
      },
    });
  }
  return {
    geminiPromptTemplate:
      row.geminiPromptTemplate || getDefaultGeminiPrompt(),
    autoPublish: row.autoPublish,
    defaultCategoryId: row.defaultCategoryId,
    socialAutoPost: row.socialAutoPost ?? true,
    accentTheme: parseAccent(row.accentTheme),
  };
}

/**
 * Accent preset for layouts. Never throws — a DB hiccup must not take the
 * whole site down just to pick a colour.
 */
export async function getAccentTheme(): Promise<AccentId> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { accentTheme: true },
    });
    return parseAccent(row?.accentTheme);
  } catch {
    return DEFAULT_ACCENT;
  }
}

export async function resolveDefaultCategoryId(
  preferred?: string | null
): Promise<string | null> {
  if (preferred) {
    const cat = await prisma.category.findUnique({ where: { id: preferred } });
    if (cat) return cat.id;
  }
  const first = await prisma.category.findFirst({
    where: { NOT: { slug: "trending" } },
    orderBy: { sortOrder: "asc" },
  });
  return first?.id || null;
}
