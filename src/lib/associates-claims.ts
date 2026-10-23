/**
 * Amazon Associates hygiene — block unverifiable savings / coupon language
 * before content is saved or published.
 */

const CLAIM_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b\d{1,3}\s*%\s*off\b/i, label: "percentage-off claims" },
  { re: /\bsave\s+up\s+to\b/i, label: "“save up to” claims" },
  { re: /\bsave\s+\$?\d+/i, label: "dollar savings claims" },
  { re: /\bwas\s*\/?\s*now\b/i, label: "was/now pricing" },
  { re: /\bwas\s+\$?\d+/i, label: "was-price claims" },
  { re: /\bnow\s+(only\s+)?\$?\d+/i, label: "now-price claims" },
  { re: /\b\d+\s*%\s*discount\b/i, label: "discount percentage claims" },
  // Bare currency amounts (Amazon Features often include "$29.99")
  { re: /\$\s?\d[\d,]*(?:\.\d{1,2})?\b/, label: "dollar price amounts" },
  { re: /£\s?\d[\d,]*(?:\.\d{1,2})?\b/, label: "pound price amounts" },
  { re: /€\s?\d[\d,]*(?:\.\d{1,2})?\b/, label: "euro price amounts" },
  {
    re: /\b(?:usd|gbp|eur)\s*\$?\s*\d[\d,]*(?:\.\d{1,2})?\b/i,
    label: "currency price amounts",
  },
  {
    re: /\b\d[\d,]*(?:\.\d{1,2})?\s*(?:usd|dollars?|pounds?|euros?)\b/i,
    label: "currency price amounts",
  },
  { re: /\bpromo\s*code\b/i, label: "promo code mentions" },
  { re: /\bcoupon\s*code\b/i, label: "coupon code mentions" },
  { re: /\buse\s+code\b/i, label: "coupon code mentions" },
  { re: /\bclip\s+coupon\b/i, label: "coupon mentions" },
  { re: /\bbest\s+price\b/i, label: "“best price” claims" },
  { re: /\blowest\s+price\b/i, label: "“lowest price” claims" },
  { re: /\bbest\s+deal\b/i, label: "“best deal” claims" },
  { re: /\blimited[- ]time\s+(offer|deal|only)\b/i, label: "limited-time claims" },
  { re: /\bonly\s+\d+\s+left\b/i, label: "scarcity stock claims" },
  { re: /\bhurry\b.{0,20}\b(deal|offer|sale)\b/i, label: "urgency sales claims" },
];

export type ClaimsCheckResult =
  | { ok: true }
  | { ok: false; reason: string; matched: string };

/** Returns the first Associates-risk claim found in text. */
export function findAssociatesClaim(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const value = text.trim();
  for (const { re, label } of CLAIM_PATTERNS) {
    if (re.test(value)) return label;
  }
  return null;
}

/**
 * Throws if any provided field contains unverifiable savings/coupon language.
 * Use before create/update/publish.
 */
export function assertAssociatesSafeCopy(
  fields: Record<string, string | null | undefined>,
  context = "Content"
): void {
  for (const [name, value] of Object.entries(fields)) {
    const hit = findAssociatesClaim(value);
    if (hit) {
      throw new Error(
        `${context}: ${name} contains ${hit}. Remove prices, % off, coupons, and unverifiable savings language (Amazon Associates).`
      );
    }
  }
}

/** Soft check for Gemini / import — returns error string or null. */
export function associatesClaimError(
  fields: Record<string, string | null | undefined>
): string | null {
  for (const [name, value] of Object.entries(fields)) {
    const hit = findAssociatesClaim(value);
    if (hit) {
      return `${name} contains ${hit}. Remove prices, % off, coupons, and unverifiable savings language.`;
    }
  }
  return null;
}

/** Allowed editorial category badges (no savings language). */
const SAFE_BADGE = /^(HOT|NEW|TRENDING|FEATURED|POPULAR)?$/i;

export function normalizeCategoryBadge(
  raw: string | null | undefined
): string | null {
  const badge = String(raw || "").trim().slice(0, 40);
  if (!badge) return null;
  if (!SAFE_BADGE.test(badge)) {
    throw new Error(
      "Badge must be empty or one of: HOT, NEW, TRENDING, FEATURED, POPULAR — no % off or savings text."
    );
  }
  return badge.toUpperCase();
}
