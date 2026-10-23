"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  readMarketPreference,
  subscribeMarketPreference,
  writeMarketPreference,
  type MarketPreference,
} from "@/lib/market-preference";

function isListingPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/deals/") ||
    pathname.startsWith("/category/") ||
    pathname === "/search"
  );
}

const OPTIONS: { value: MarketPreference; label: string; title: string }[] = [
  { value: "", label: "All", title: "All Amazon stores" },
  { value: "US", label: "US", title: "Amazon.com (US)" },
  { value: "UK", label: "UK", title: "Amazon.co.uk (UK)" },
];

/**
 * Store switcher (segmented control): All / US / UK.
 * Remembered in localStorage so category and search links keep the same store.
 */
export function MarketplaceFilter({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const urlMarket = (params.get("market") || "").toUpperCase();
  // Listing pages carry ?market=; elsewhere (Browse, Help…) show the
  // remembered store so the switch never looks reset
  const active = useActiveMarket();
  const current: MarketPreference =
    urlMarket === "US" || urlMarket === "UK" ? urlMarket : active;

  useEffect(() => {
    if (urlMarket === "US" || urlMarket === "UK") {
      writeMarketPreference(urlMarket);
    } else if (params.has("market")) {
      // market= / market=all → "All stores"
      writeMarketPreference("");
    }
  }, [urlMarket, params]);

  function hrefFor(value: MarketPreference) {
    const listing = isListingPath(pathname);
    const base = listing ? pathname : "/";
    const next = new URLSearchParams(listing ? params.toString() : "");
    next.delete("page");
    // "All" drops the param; the click saves the preference first, so the
    // remembered store doesn't re-apply on the next page
    if (value) next.set("market", value);
    else next.delete("market");
    if (base !== "/search") next.delete("q");
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <div
      role="group"
      aria-label="Amazon store"
      className={`inline-flex shrink-0 items-center rounded-full bg-card-muted p-0.5 ring-1 ring-border-subtle ${className}`}
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <Link
            key={o.label}
            href={hrefFor(o.value)}
            scroll={false}
            title={o.title}
            aria-current={active ? "true" : undefined}
            onClick={() => writeMarketPreference(o.value)}
            className={`pressable inline-flex h-8 min-w-11 items-center justify-center rounded-full px-2.5 text-[13px] font-semibold ${
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted hover:text-foreground"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Resolve active market from URL, else remembered preference (for nav links). */
export function useActiveMarket(): MarketPreference {
  const params = useSearchParams();
  // Server snapshot is "All" so hydration matches; the stored value follows
  const pref = useSyncExternalStore(
    subscribeMarketPreference,
    () => readMarketPreference() ?? "",
    () => ""
  );
  const url = (params.get("market") || "").toUpperCase();
  if (url === "US" || url === "UK") return url;
  if (params.has("market")) return "";
  return pref === "US" || pref === "UK" ? pref : "";
}
