/**
 * Amazon Associates hygiene — block copy the Program Policies / FTC rules
 * don't allow before it is saved or published: prices and savings (only
 * Amazon's live data may show prices), coupons, customer reviews and star
 * ratings (Participation Requirements §6(t)), Amazon program badges,
 * shipping/Prime promises, urgency, and invented first-hand testing.
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
  { re: /\blimited[- ]time\b/i, label: "limited-time claims" },
  {
    re: /\b(today only|while (stocks?|supplies) last|ends (soon|tonight|today)|act fast|selling fast|don'?t miss out)\b/i,
    label: "urgency claims",
  },
  {
    re: /\b(cheapest|lowest[- ]ever|price (drop|cut)|on sale|clearance|bargain)\b/i,
    label: "price claims",
  },
  // Amazon program badges / rankings are Amazon content and change constantly
  { re: /\bamazon'?s\s+choice\b/i, label: "“Amazon's Choice” badges" },
  { re: /\bbest[- ]?sell(er|ing)\b/i, label: "best-seller claims" },
  { re: /#\s?1\s+(best|seller|selling|rated|in)\b/i, label: "ranking claims" },
  // Customer reviews / star ratings may not be displayed (Policies §6(t))
  {
    re: /\b\d(?:\.\d)?\s*(?:out of 5|\/\s*5)\b|\b[1-5]\.\d\s*stars?\b|\b(?:[1-5]|five|four)[- ]star\s+(?:rated|rating|reviews?)\b|\bstar[- ]rat(?:ed|ing)\b/i,
    label: "star ratings",
  },
  { re: /\b\d[\d,]*\+?\s+(?:customer\s+)?(?:reviews|ratings)\b/i, label: "review counts" },
  { re: /\b(customer|verified|buyer)\s+reviews?\b/i, label: "customer review mentions" },
  { re: /\b(top|highly)[- ]rated\b/i, label: "rating claims" },
  // Shipping / Prime / returns are Amazon's terms and vary per customer
  { re: /\bprime\s+(eligible|shipping|delivery|members?)\b/i, label: "Prime claims" },
  { re: /\bfree\s+(shipping|delivery|returns)\b/i, label: "shipping claims" },
  // FTC: no invented first-hand experience
  { re: /\b(i|we)\s+(tested|tried|used|own|reviewed)\b/i, label: "first-hand testing claims" },
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
