"use client";

import { useEffect, useState } from "react";
import { AFFILIATE_LINK_REL } from "@/lib/affiliate-disclosure";

/**
 * Phone/tablet CTA that docks above the tab bar once the in-page button
 * scrolls away, so it's never duplicated on screen.
 */
export function StickyDealCta({
  goUrl,
  title,
  anchorId = "deal-primary-cta",
}: {
  goUrl: string;
  title: string;
  anchorId?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId]);

  return (
    <div
      aria-hidden={!show}
      className={`bar-material fixed inset-x-0 z-40 border-t border-border-subtle px-4 py-2.5 transition-transform duration-200 lg:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted">Paid link</p>
        </div>
        <a
          href={goUrl}
          target="_blank"
          rel={AFFILIATE_LINK_REL}
          tabIndex={show ? 0 : -1}
          className="pressable inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-dark"
        >
          Get deal on Amazon
        </a>
      </div>
    </div>
  );
}
