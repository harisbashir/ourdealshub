"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appendMarketQuery } from "@/lib/market-preference";
import { useActiveMarket } from "@/components/MarketplaceFilter";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SiteSearch } from "@/components/SiteSearch";

export type CategoryNavItem = {
  name: string;
  slug: string;
  icon: string;
};

/** Horizontally scrolling category chips (home + category pages). */
export function CategoryBar({ categories }: { categories: CategoryNavItem[] }) {
  const pathname = usePathname();
  const market = useActiveMarket();

  const onListing =
    pathname === "/" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/deals/");
  if (!categories.length || !onListing) return null;

  return (
    <>
      {/* Search gets the primary spot on the phone home screen (HIG › Searching) */}
      {pathname === "/" && (
        <div className="site-container pt-3 lg:hidden">
          <SiteSearch size="lg" />
        </div>
      )}
    <nav aria-label="Categories" className="site-container pt-3">
      <ul className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
        {categories.map((cat) => {
          const href =
            cat.slug === "trending" ? "/deals/trending" : `/category/${cat.slug}`;
          const active =
            pathname === href || pathname.startsWith(`/category/${cat.slug}/`);
          return (
            <li key={cat.slug} className="shrink-0">
              <Link
                href={appendMarketQuery(href, market)}
                aria-current={active ? "page" : undefined}
                className={`pressable inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium whitespace-nowrap ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-card text-foreground ring-border hover:bg-card-muted"
                }`}
              >
                <CategoryIcon name={cat.icon} className="h-4 w-4" />
                {cat.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}
