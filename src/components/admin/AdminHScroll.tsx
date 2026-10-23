"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scroller with L/R arrows — mobile + desktop when content overflows */
export function AdminHScroll({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanLeft(el.scrollLeft > 1);
    setCanRight(maxScroll > 2 && el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    const t1 = window.setTimeout(update, 50);
    const t2 = window.setTimeout(update, 300);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [update]);

  function scroll(dir: number) {
    const el = scroller.current;
    if (!el) return;
    const step = Math.max(180, Math.round(el.clientWidth * 0.75));
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.min(maxScroll, Math.max(0, el.scrollLeft + dir * step));
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: next, behavior: "smooth" });
    } else {
      el.scrollLeft = next;
    }
    requestAnimationFrame(update);
    window.setTimeout(update, 200);
    window.setTimeout(update, 500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        disabled={!canLeft}
        className="absolute left-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-md transition-all hover:border-brand hover:text-brand disabled:opacity-0 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        disabled={!canRight}
        className="absolute right-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-md transition-all hover:border-brand hover:text-brand disabled:opacity-0 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div
        ref={scroller}
        className="overflow-x-auto overflow-y-hidden scrollbar-hide touch-pan-x overscroll-x-contain scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
    </div>
  );
}
