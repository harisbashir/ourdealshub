"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ScrollRow({
  children,
  className = "",
  itemClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const items = Children.toArray(children);

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
    if (track.current) ro.observe(track.current);
    for (const child of Array.from(track.current?.children || [])) {
      ro.observe(child);
    }

    const onLoad = () => update();
    window.addEventListener("load", onLoad);
    el.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", onLoad);
    });

    const t1 = window.setTimeout(update, 50);
    const t2 = window.setTimeout(update, 300);
    const t3 = window.setTimeout(update, 1000);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("load", onLoad);
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [items.length, update]);

  function scroll(dir: number) {
    const el = scroller.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.8));
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
    <div className={`relative w-full min-w-0 ${className}`}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        disabled={!canLeft}
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-lg shadow-black/10 transition-all hover:border-brand hover:text-brand active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        ref={scroller}
        className="w-full min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-hide py-1.5 px-10 sm:px-12 touch-pan-x overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          ref={track}
          className="flex w-max items-stretch gap-2 sm:gap-3"
        >
          {items.map((child, i) => (
            <div
              key={i}
              className={`snap-start shrink-0 grow-0 flex flex-col self-stretch ${itemClassName}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        disabled={!canRight}
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-lg shadow-black/10 transition-all hover:border-brand hover:text-brand active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
