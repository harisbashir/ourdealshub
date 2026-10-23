"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal carousel. Touch: native swipe with scroll-snap. Mouse/trackpad:
 * arrow buttons appear (only when there is more to scroll in that direction).
 */
export function ScrollRow({
  children,
  label,
  itemClassName = "",
}: {
  children: React.ReactNode;
  label: string;
  itemClassName?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const items = Children.toArray(children);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items.length, update]);

  function scroll(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  const arrow =
    "pressable absolute top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md hover:bg-card-muted [@media(pointer:fine)]:flex";

  return (
    <div className="relative">
      {canLeft && (
        <button type="button" aria-label="Scroll back" onClick={() => scroll(-1)} className={`${arrow} -left-3`}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      )}
      <div
        ref={scroller}
        role="list"
        aria-label={label}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 pt-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-2 lg:px-2"
      >
        {items.map((child, i) => (
          <div key={i} role="listitem" className={`flex shrink-0 snap-start ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>
      {canRight && (
        <button type="button" aria-label="Scroll forward" onClick={() => scroll(1)} className={`${arrow} -right-3`}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
