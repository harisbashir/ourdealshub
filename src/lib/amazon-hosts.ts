/**
 * Strict Amazon hostname allowlist.
 * Rejects lookalikes like amazon.com.evil.com / amazon.evil.com.
 */

/** Known retail marketplaces (host without www.). */
const AMAZON_RETAIL = new Set([
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.mx",
  "amazon.com.br",
  "amazon.com.au",
  "amazon.co.jp",
  "amazon.in",
  "amazon.sg",
  "amazon.ae",
  "amazon.sa",
  "amazon.eg",
  "amazon.com.tr",
  "amazon.com.be",
]);

const AMAZON_SHORT = new Set(["amzn.to", "a.co", "amzn.eu"]);

function stripWww(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./i, "");
}

/**
 * True for amazon.com, smile.amazon.com, amazon.co.uk, etc.
 * False for amazon.com.evil.com or amazon.evil.com.
 */
export function isAmazonRetailHost(hostname: string): boolean {
  const host = stripWww(hostname);
  if (!host || host.includes("..") || host.startsWith(".")) return false;

  for (const market of AMAZON_RETAIL) {
    if (host === market || host.endsWith(`.${market}`)) return true;
  }
  return false;
}

export function isAmazonShortHost(hostname: string): boolean {
  return AMAZON_SHORT.has(stripWww(hostname));
}

/** Product paste / import: retail or known Amazon shortener. */
export function isAmazonProductHost(hostname: string): boolean {
  return isAmazonRetailHost(hostname) || isAmazonShortHost(hostname);
}

/**
 * /go redirect target: prefer full retail hosts.
 * Short links allowed only if already stored (legacy); new saves rebuild to /dp/.
 */
export function isAmazonRedirectHost(hostname: string): boolean {
  return isAmazonRetailHost(hostname) || isAmazonShortHost(hostname);
}
