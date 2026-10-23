"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Search } from "lucide-react";
import { readMarketPreference } from "@/lib/market-preference";

function SiteSearchInner({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const next = new URLSearchParams();
    next.set("q", query);
    const fromUrl = (params.get("market") || "").toUpperCase();
    const pref = readMarketPreference();
    const market =
      fromUrl === "US" || fromUrl === "UK"
        ? fromUrl
        : pref === "US" || pref === "UK"
          ? pref
          : "";
    if (market) next.set("market", market);
    router.push(`/search?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full min-w-0">
      <Search
        className="site-search-icon pointer-events-none absolute left-2 sm:left-2.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2"
        strokeWidth={2.75}
        aria-hidden
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search deals"
        className="site-search-input w-full min-w-0 rounded-md sm:rounded-lg border-2 border-brand py-1 sm:py-2 pl-7 sm:pl-9 pr-2 sm:pr-3 text-[12px] sm:text-[13px] font-medium text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </form>
  );
}

export function SiteSearch({ initialQuery = "" }: { initialQuery?: string }) {
  return (
    <Suspense fallback={null}>
      <SiteSearchInner initialQuery={initialQuery} />
    </Suspense>
  );
}
