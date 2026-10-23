import type { Metadata } from "next";
import { BookOpen, CircleHelp, Flame, LayoutGrid, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GroupedList } from "@/components/GroupedList";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
  title: "Browse",
  description: "Browse every category of curated Amazon picks on OurDealsHub.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null, NOT: { slug: "trending" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      icon: true,
    },
  });

  return (
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
        Browse
      </h1>

      <GroupedList
        title="Collections"
        rows={[
          { href: "/deals/trending", label: "Trending", icon: <Flame className="h-5 w-5" aria-hidden /> },
          { href: "/deals/just-added", label: "New", icon: <Sparkles className="h-5 w-5" aria-hidden /> },
          { href: "/deals/all", label: "All Picks", icon: <LayoutGrid className="h-5 w-5" aria-hidden /> },
        ]}
      />

      <GroupedList
        title="Categories"
        rows={categories.map((c) => ({
          href: `/category/${c.slug}`,
          label: c.name,
          icon: <CategoryIcon name={c.icon} />,
        }))}
      />

      <GroupedList
        title="More"
        rows={[
          { href: "/blog", label: "Guides & Blog", icon: <BookOpen className="h-5 w-5" aria-hidden /> },
          { href: "/help", label: "Help", icon: <CircleHelp className="h-5 w-5" aria-hidden /> },
        ]}
      />
    </div>
  );
}
