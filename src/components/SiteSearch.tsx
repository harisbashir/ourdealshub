"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Search, X } from "lucide-react";
import { readMarketPreference } from "@/lib/market-preference";

function SiteSearchInner({
  initialQuery = "",
  autoFocus = false,
  size = "md",
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const next = new URLSearchParams({ q: query });
    const fromUrl = (params.get("market") || "").toUpperCase();
    const pref = readMarketPreference();
    const market =
      fromUrl === "US" || fromUrl === "UK" || fromUrl === "CA"
        ? fromUrl
        : pref === "US" || pref === "UK" || pref === "CA"
          ? pref
          : "";
    if (market) next.set("market", market);
    router.push(`/search?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      <label htmlFor="site-search" className="sr-only">
        Search picks
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-fg"
        aria-hidden
      />
      <input
        id="site-search"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search picks"
        className={`w-full rounded-full border border-transparent bg-card-muted pl-10 pr-10 text-foreground placeholder:text-muted-fg outline-none focus:border-field-border focus:bg-card [&::-webkit-search-cancel-button]:hidden ${
          size === "lg" ? "h-12 text-[17px]" : "h-10 text-[15px]"
        }`}
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-fg hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  );
}

export function SiteSearch(props: {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <Suspense fallback={<div className="h-10 w-full rounded-full bg-card-muted" />}>
      <SiteSearchInner {...props} />
    </Suspense>
  );
}
