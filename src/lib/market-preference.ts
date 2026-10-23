/** Client-side remembered Amazon store filter (All / US / UK). */

export const MARKET_PREF_KEY = "odh-market";

export type MarketPreference = "" | "US" | "UK";

export function readMarketPreference(): MarketPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MARKET_PREF_KEY);
    if (raw === null) return null;
    const v = raw.trim().toUpperCase();
    if (v === "" || v === "ALL") return "";
    if (v === "US" || v === "UK") return v;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

const listeners = new Set<() => void>();

export function writeMarketPreference(value: MarketPreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MARKET_PREF_KEY, value === "" ? "ALL" : value);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

/** useSyncExternalStore subscription (same-tab writes + other tabs). */
export function subscribeMarketPreference(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === MARKET_PREF_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function marketQuerySuffix(market: string | null | undefined): string {
  const v = (market || "").trim().toUpperCase();
  if (v === "US" || v === "UK") return `?market=${v}`;
  return "";
}

export function appendMarketQuery(
  href: string,
  market: string | null | undefined
): string {
  const v = (market || "").trim().toUpperCase();
  if (v !== "US" && v !== "UK") return href;
  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}market=${v}`;
}
