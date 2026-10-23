"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  readMarketPreference,
  writeMarketPreference,
  type MarketPreference,
} from "@/lib/market-preference";

function isListingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/deals/")) return true;
  if (pathname.startsWith("/category/")) return true;
  if (pathname === "/search") return true;
  return false;
}

function chipClass(active: boolean, value: string, large = false) {
  const tone = active
    ? value === "UK"
      ? "border-sky-500 bg-sky-500 text-white"
      : "border-brand bg-brand text-white"
    : "border-border bg-card text-muted hover:border-brand hover:text-brand";
  return `rounded-md border font-bold uppercase tracking-wide transition-colors flex items-center justify-center ${
    large
      ? "flex-1 py-1 text-[10px] min-h-[1.65rem]"
      : "px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px]"
  } ${tone}`;
}

/**
 * Store chips — All / US / UK.
 * mobileBar: full-width equal taps under the search row.
 * Default (desktop): compact inline chips.
 * Remembers choice in localStorage so category nav keeps the same store.
 */
export function MarketplaceFilter({
  className = "",
  mobileBar = false,
}: {
  className?: string;
  mobileBar?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const urlMarket = (params.get("market") || "").toUpperCase();
  const current =
    urlMarket === "US" || urlMarket === "UK" ? urlMarket : "";

  useEffect(() => {
    if (urlMarket === "US" || urlMarket === "UK") {
      writeMarketPreference(urlMarket);
      return;
    }
    if (params.has("market") && !urlMarket) {
      writeMarketPreference("");
    }
  }, [urlMarket, params]);

  function hrefFor(value: MarketPreference) {
    const base = isListingPath(pathname) ? pathname : "/";
    const next = new URLSearchParams(
      isListingPath(pathname) ? params.toString() : ""
    );
    next.delete("page");
    if (value) next.set("market", value);
    else next.delete("market");
    if (base !== "/search") next.delete("q");
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  }

  function onPick(value: MarketPreference) {
    writeMarketPreference(value);
  }

  const allActive = !current;
  const usActive = current === "US";
  const ukActive = current === "UK";

  if (mobileBar) {
    return (
      <div
        className={`flex w-full items-center gap-1 ${className}`}
        role="group"
        aria-label="Filter by Amazon store"
      >
        <Link
          href={hrefFor("")}
          className={chipClass(allActive, "", true)}
          scroll={false}
          title="All stores"
          onClick={() => onPick("")}
        >
          All
        </Link>
        <Link
          href={hrefFor("US")}
          className={chipClass(usActive, "US", true)}
          scroll={false}
          title="Amazon.com"
          onClick={() => onPick("US")}
        >
          US
        </Link>
        <Link
          href={hrefFor("UK")}
          className={chipClass(ukActive, "UK", true)}
          scroll={false}
          title="Amazon.co.uk"
          onClick={() => onPick("UK")}
        >
          UK
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-1 ${className}`}
      role="group"
      aria-label="Filter by Amazon store"
    >
      <Link
        href={hrefFor("")}
        className={chipClass(allActive, "")}
        scroll={false}
        title="All stores"
        onClick={() => onPick("")}
      >
        All
      </Link>
      <Link
        href={hrefFor("US")}
        className={chipClass(usActive, "US")}
        scroll={false}
        title="Amazon.com"
        onClick={() => onPick("US")}
      >
        US
      </Link>
      <Link
        href={hrefFor("UK")}
        className={chipClass(ukActive, "UK")}
        scroll={false}
        title="Amazon.co.uk"
        onClick={() => onPick("UK")}
      >
        UK
      </Link>
    </div>
  );
}

/** Resolve active market from URL, else remembered preference (for nav links). */
export function useActiveMarket(): MarketPreference {
  const params = useSearchParams();
  const url = (params.get("market") || "").toUpperCase();
  if (url === "US" || url === "UK") return url;
  if (params.has("market")) return "";
  const pref = readMarketPreference();
  if (pref === "US" || pref === "UK") return pref;
  return "";
}
