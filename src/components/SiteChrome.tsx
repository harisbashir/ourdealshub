"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Search } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MarketplaceFilter } from "@/components/MarketplaceFilter";
import { MarketPreferenceSync } from "@/components/MarketPreferenceSync";
import { SiteSearch } from "@/components/SiteSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSavedSlugs } from "@/lib/saved";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/browse", label: "Browse", Icon: LayoutGrid },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/saved", label: "Saved", Icon: Heart },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/deals/");
  if (href === "/browse") {
    return pathname === "/browse" || pathname.startsWith("/category/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Top bar (all sizes) + bottom tab bar (phones/tablets < 1024px).
 * Tab bar per HIG › Tab bars: always visible, navigation only, short labels.
 * At desktop width the same destinations move into the top bar.
 */
export function SiteChrome() {
  const pathname = usePathname();
  const savedCount = useSavedSlugs().length;

  return (
    <>
      <Suspense fallback={null}>
        <MarketPreferenceSync />
      </Suspense>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="bar-material sticky top-0 z-50 border-b border-border-subtle pt-[env(safe-area-inset-top)]">
        <div className="site-container flex h-14 items-center gap-2 lg:gap-4">
          <Link
            href="/"
            className="-ml-1 flex shrink-0 items-center gap-2 rounded-xl px-1 py-1"
            aria-label="OurDealsHub home"
          >
            <BrandMark className="h-8 w-8" />
            <span className="text-[17px] font-bold tracking-tight text-foreground max-[379px]:sr-only">
              OurDealsHub
            </span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {[TABS[0], TABS[1], TABS[3], { href: "/help", label: "Help" }].map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-full px-3.5 text-[15px] font-medium ${
                    active
                      ? "bg-card-muted text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {t.href === "/saved" && savedCount > 0 && (
                    <span className="ml-1.5 text-xs text-muted-fg">{savedCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden w-full max-w-xs lg:block">
            <SiteSearch />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Suspense fallback={null}>
              <MarketplaceFilter />
            </Suspense>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <nav
        aria-label="Sections"
        className="bar-material fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-4">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  <Icon
                    className="h-6 w-6"
                    strokeWidth={active ? 2.4 : 1.8}
                    aria-hidden
                  />
                  {label}
                  {href === "/saved" && savedCount > 0 && (
                    <span className="absolute left-1/2 top-1.5 ml-2 min-w-[1.125rem] rounded-full bg-brand px-1 text-center text-[11px] font-semibold leading-[1.125rem] text-on-brand">
                      <span className="sr-only">, </span>
                      {savedCount > 99 ? "99+" : savedCount}
                      <span className="sr-only"> saved</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
