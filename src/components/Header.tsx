import Link from "next/link";
import { Suspense } from "react";
import { SiteSearch } from "./SiteSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarketplaceFilter } from "@/components/MarketplaceFilter";
import { MarketPreferenceSync } from "@/components/MarketPreferenceSync";

export function Header() {
  return (
    <header className="border-b border-border">
      <Suspense fallback={null}>
        <MarketPreferenceSync />
      </Suspense>
      <div className="site-container py-1 sm:py-2 space-y-1 sm:space-y-0">
        <div className="flex items-center gap-1 sm:gap-2.5">
          <Link
            href="/"
            className="brand-chip group flex shrink-0 items-center gap-1 sm:gap-2 rounded-md sm:rounded-lg border px-0.5 py-0.5 sm:px-2 sm:py-1.5"
          >
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-brand text-white font-bold text-[10px] sm:text-sm shadow-sm transition-colors group-hover:bg-brand-dark">
              OD
            </span>
            <span className="leading-tight hidden min-[380px]:block">
              <span className="block text-[10px] sm:text-sm font-bold text-foreground">
                OurDealsHub
              </span>
              <span className="hidden sm:block text-[10px] text-muted">
                Curated Amazon deals
              </span>
            </span>
          </Link>

          <Suspense fallback={null}>
            <div className="hidden sm:block">
              <MarketplaceFilter />
            </div>
          </Suspense>

          <div className="flex-1 min-w-0">
            <div className="w-full sm:max-w-80 sm:mx-auto">
              <SiteSearch />
            </div>
          </div>

          <ThemeToggle compact />
        </div>

        <Suspense fallback={null}>
          <div className="sm:hidden">
            <MarketplaceFilter mobileBar />
          </div>
        </Suspense>
      </div>
    </header>
  );
}
