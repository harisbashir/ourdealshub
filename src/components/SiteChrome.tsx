"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Header } from "@/components/Header";
import { CategoryBar, type CategoryNavItem } from "@/components/CategoryBar";

const MOBILE_MQ = "(max-width: 639px)";

/**
 * Sticky chrome: Header always stays.
 * On mobile only: category pills + disclosure hide on scroll-down;
 * they return when scrolling up or near the top. Desktop always shows them.
 */
export function SiteChrome({
  categories,
}: {
  categories: CategoryNavItem[];
}) {
  const [navHidden, setNavHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    lastY.current = window.scrollY;

    function isMobile() {
      return mq.matches;
    }

    function onScroll() {
      if (!isMobile()) {
        setNavHidden(false);
        lastY.current = window.scrollY;
        return;
      }
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        const nearTop = y < 24;

        if (nearTop) {
          setNavHidden(false);
        } else if (delta > 6) {
          setNavHidden(true);
        } else if (delta < -6) {
          setNavHidden(false);
        }

        lastY.current = y;
        ticking.current = false;
      });
    }

    function onViewportChange() {
      if (!isMobile()) setNavHidden(false);
      lastY.current = window.scrollY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onViewportChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onViewportChange);
    };
  }, []);

  return (
    <div className="site-chrome sticky top-0 z-50 border-b border-border shadow-sm">
      <Header />
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out sm:!grid-rows-[1fr] sm:!opacity-100 sm:!pointer-events-auto ${
          navHidden
            ? "grid-rows-[0fr] opacity-0 pointer-events-none"
            : "grid-rows-[1fr] opacity-100"
        }`}
        aria-hidden={navHidden || undefined}
      >
        <div className="min-h-0 overflow-hidden">
          <Suspense fallback={null}>
            <CategoryBar categories={categories} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
