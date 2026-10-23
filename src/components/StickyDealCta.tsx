"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  LINK_LEVEL_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

/**
 * Mobile-only sticky Amazon CTA. Hides while the in-page CTA is on screen
 * so the button is not duplicated.
 */
export function StickyDealCta({
  goUrl,
  marketplace: _marketplace,
  anchorId = "deal-primary-cta",
}: {
  goUrl: string;
  marketplace: string | null | undefined;
  anchorId?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting);
      },
      { root: null, threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId]);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden pointer-events-none">
      <div className="pointer-events-auto border-t border-border bg-background/95 backdrop-blur-md px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)]">
        <a
          href={goUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white hover:bg-brand-dark transition-colors"
        >
          View on Amazon
        </a>
        <p className="mt-1.5 text-[10px] text-muted-fg text-center leading-snug">
          <span className="font-semibold text-foreground/80">
            {LINK_LEVEL_DISCLOSURE}
          </span>{" "}
          {AMAZON_ASSOCIATE_STATEMENT}{" "}
          <Link href="/disclosure" className="underline hover:text-brand">
            Details
          </Link>
        </p>
      </div>
    </div>
  );
}
