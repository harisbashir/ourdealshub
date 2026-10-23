"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readMarketPreference } from "@/lib/market-preference";

function isListingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/deals/")) return true;
  if (pathname.startsWith("/category/")) return true;
  if (pathname === "/search") return true;
  return false;
}

/**
 * If the URL has no market= but the user previously chose US/UK, apply it
 * once so category / home / search stay on the same store.
 */
export function MarketPreferenceSync() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isListingPath(pathname)) return;
    if (params.has("market")) return;

    const pref = readMarketPreference();
    if (pref !== "US" && pref !== "UK") return;

    const next = new URLSearchParams(params.toString());
    next.set("market", pref);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, params, router]);

  return null;
}
