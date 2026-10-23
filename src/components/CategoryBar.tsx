"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Flame,
  Cpu,
  Home,
  Shirt,
  Heart,
  Gamepad2,
  Bike,
  BookOpen,
  PawPrint,
  Baby,
  Car,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AFFILIATE_CHROME_LINE } from "@/lib/affiliate-disclosure";
import { appendMarketQuery } from "@/lib/market-preference";
import { useActiveMarket } from "@/components/MarketplaceFilter";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  cpu: Cpu,
  home: Home,
  shirt: Shirt,
  heart: Heart,
  gamepad: Gamepad2,
  bike: Bike,
  book: BookOpen,
  paw: PawPrint,
  baby: Baby,
  car: Car,
  tag: Tag,
};

export type CategoryNavItem = {
  name: string;
  slug: string;
  icon: string;
};

export function CategoryBar({
  categories,
}: {
  categories: CategoryNavItem[];
  activeSlug?: string;
}) {
  const pathname = usePathname();
  const market = useActiveMarket();
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft;
    setCanScrollLeft(left > 1);
    setCanScrollRight(maxScroll > 2 && left < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    window.addEventListener("orientationchange", updateScrollState);

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateScrollState);
    });
    ro.observe(el);
    if (track.current) ro.observe(track.current);

    const t1 = window.setTimeout(updateScrollState, 50);
    const t2 = window.setTimeout(updateScrollState, 250);
    const t3 = window.setTimeout(updateScrollState, 800);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      window.removeEventListener("orientationchange", updateScrollState);
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [categories, updateScrollState]);

  function scroll(dir: number) {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.max(180, Math.round(el.clientWidth * 0.65));
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.min(maxScroll, Math.max(0, el.scrollLeft + dir * amount));
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: next, behavior: "smooth" });
    } else {
      el.scrollLeft = next;
    }
    requestAnimationFrame(updateScrollState);
    window.setTimeout(updateScrollState, 200);
    window.setTimeout(updateScrollState, 500);
  }

  function isActive(slug: string) {
    if (slug === "trending") {
      return (
        pathname === "/" ||
        pathname === "/deals/trending" ||
        pathname === "/category/trending"
      );
    }
    return (
      pathname === `/category/${slug}` ||
      pathname.startsWith(`/category/${slug}/`)
    );
  }

  return (
    <div>
      <div className="site-container">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            aria-label="Scroll categories left"
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="header-glass-btn flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-all hover:text-brand active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/*
            Scroller is NOT display:flex — inner w-max track fixes
            scrollWidth===clientWidth bugs on mobile + desktop.
          */}
          <div
            ref={scroller}
            className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth touch-pan-x overscroll-x-contain py-1 sm:py-1.5"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              ref={track}
              className="flex w-max items-center gap-1.5 sm:gap-2 pr-1"
            >
              {categories.map((cat) => {
                const Icon = ICONS[cat.icon] || Tag;
                const active = isActive(cat.slug);
                const href = appendMarketQuery(
                  cat.slug === "trending" ? "/" : `/category/${cat.slug}`,
                  market
                );
                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className={`cat-pill flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-[13px] font-semibold whitespace-nowrap ${
                      active ? "cat-pill--active" : ""
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    {cat.name}
                  </Link>
                );
              })}
              <Link
                href="/blog"
                className={`cat-pill flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-[13px] font-semibold whitespace-nowrap ${
                  pathname === "/blog" || pathname.startsWith("/blog/")
                    ? "cat-pill--active"
                    : ""
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                Blog
              </Link>
            </div>
          </div>

          <button
            type="button"
            aria-label="Scroll categories right"
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="header-glass-btn flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-all hover:text-brand active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="site-container pb-1 pt-0 text-[9px] sm:text-[10px] text-muted leading-snug">
        {AFFILIATE_CHROME_LINE}{" "}
        <Link
          href="/disclosure"
          className="underline hover:text-brand font-medium text-foreground/80"
        >
          Disclosure
        </Link>
      </p>
    </div>
  );
}
