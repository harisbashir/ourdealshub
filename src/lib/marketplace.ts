/**
 * Amazon retail marketplaces we support for import + public badges.
 */

export type MarketplaceCode = "US" | "UK";

export type MarketplaceConfig = {
  code: MarketplaceCode;
  /** Short badge on cards */
  badge: string;
  /** User-facing store label */
  label: string;
  /** Creators API marketplace / x-marketplace value */
  marketplaceHost: string;
  /** Retail hostname without www */
  retailHost: string;
};

export const MARKETPLACES: Record<MarketplaceCode, MarketplaceConfig> = {
  US: {
    code: "US",
    badge: "US",
    label: "Amazon.com (US)",
    marketplaceHost: "www.amazon.com",
    retailHost: "amazon.com",
  },
  UK: {
    code: "UK",
    badge: "UK",
    label: "Amazon.co.uk (UK)",
    marketplaceHost: "www.amazon.co.uk",
    retailHost: "amazon.co.uk",
  },
};

export const MARKETPLACE_OPTIONS: MarketplaceCode[] = ["US", "UK"];

export function isMarketplaceCode(value: string): value is MarketplaceCode {
  return value === "US" || value === "UK";
}

export function parseMarketplace(
  value: string | null | undefined
): MarketplaceCode {
  const v = String(value || "US").trim().toUpperCase();
  return isMarketplaceCode(v) ? v : "US";
}

/** Infer marketplace from a pasted Amazon URL (ASIN-only → null). */
export function detectMarketplaceFromInput(
  input: string
): MarketplaceCode | null {
  const raw = input.trim();
  if (!raw || /^[A-Z0-9]{10}$/i.test(raw)) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "amazon.co.uk" || host.endsWith(".amazon.co.uk")) return "UK";
    if (host === "amazon.com" || host.endsWith(".amazon.com")) return "US";
  } catch {
    /* not a URL */
  }
  return null;
}

export function marketplaceLabel(code: string | null | undefined): string {
  return MARKETPLACES[parseMarketplace(code)].label;
}

export function marketplaceBadge(code: string | null | undefined): string {
  return MARKETPLACES[parseMarketplace(code)].badge;
}

/**
 * Classes for the small US/UK store tag. Neutral on purpose: the accent colour
 * means "action" everywhere, so the store is told apart by its text label.
 */
export function marketplaceTagClass(_code?: string | null): string {
  return "border-border bg-card text-foreground";
}

/** URL / filter param → US | UK | null (all). */
export function parseMarketplaceFilter(
  value: string | null | undefined
): MarketplaceCode | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  return isMarketplaceCode(v) ? v : null;
}

/** Short “ships to / store” line for deal pages. */
export function marketplaceShipsNote(code: string | null | undefined): string {
  const market = parseMarketplace(code);
  if (market === "UK") {
    return "Opens on Amazon.co.uk (UK store). Price and availability are shown on Amazon.";
  }
  return "Opens on Amazon.com (US store). Price and availability are shown on Amazon.";
}

/** One-line store cue for social captions. */
export function marketplaceSocialLine(code: string | null | undefined): string {
  const market = parseMarketplace(code);
  return market === "UK"
    ? "Available on Amazon.co.uk (UK)"
    : "Available on Amazon.com (US)";
}


