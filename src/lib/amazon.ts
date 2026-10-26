import { isAmazonRetailHost } from "@/lib/amazon-hosts";
import { getApiConfig } from "@/lib/api-config";
import { parseAmazonDiscount, type AmazonDiscount } from "@/lib/amazon-discounts";
import {
  MARKETPLACES,
  parseMarketplace,
  type MarketplaceCode,
} from "@/lib/marketplace";

/**
 * Amazon Creators API client (successor to PA-API 5, which Amazon retired in
 * 2026 — PA-API calls now return 403).
 *
 * Protocol (from Amazon's Apache-2.0 Node SDK + Creators API docs):
 * - OAuth2 client_credentials token, cached ~1h.
 *   v3.x (Login with Amazon): JSON body, scope "creatorsapi::default".
 *   v2.x (Cognito): form body, scope "creatorsapi/default".
 * - POST https://creatorsapi.amazon/catalog/v1/getItems
 *   Authorization: Bearer <token>   (v2.x appends ", Version <v>")
 *   x-marketplace: www.amazon.com
 *   lowerCamelCase request/response fields; root key "itemsResult".
 *
 * Credentials are per store (US / UK), managed in Admin → Settings → API keys.
 */

export type AmazonLookupResult = {
  discount: AmazonDiscount | null;
  asin: string;
  title: string;
  description: string;
  /** Amazon CDN image URL — never download or rehost */
  imageUrl: string;
  detailPageUrl: string;
  /** Browse path root → leaf from Amazon (for auto category) */
  categoryPath: string[];
  productGroup: string | null;
  marketplace: MarketplaceCode;
};

const API_BASE = "https://creatorsapi.amazon/catalog/v1";
const REQUEST_TIMEOUT_MS = 15_000;

const TOKEN_ENDPOINTS: Record<string, string> = {
  "2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
  "2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
  "2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};

export function tokenEndpointFor(version: string): string {
  const url = TOKEN_ENDPOINTS[version.trim()];
  if (!url) {
    throw new Error(
      `Unsupported Creators API credential version "${version}". Use one of: ${Object.keys(TOKEN_ENDPOINTS).join(", ")}.`
    );
  }
  return url;
}

export function isLwaVersion(version: string): boolean {
  return version.trim().startsWith("3.");
}

type Credentials = { id: string; secret: string; version: string };

async function loadCredentials(
  market: MarketplaceCode
): Promise<Credentials | null> {
  const prefix = `AMAZON_${market}` as const;
  const [id, secret, version] = await Promise.all([
    getApiConfig(`${prefix}_CREDENTIAL_ID`),
    getApiConfig(`${prefix}_CREDENTIAL_SECRET`),
    getApiConfig(`${prefix}_CREDENTIAL_VERSION`),
  ]);
  if (!id || !secret || !version) return null;
  return { id, secret, version };
}

/** Creators API credentials present for this store (or any store when omitted). */
export async function isAmazonConfigured(
  market?: MarketplaceCode | string
): Promise<boolean> {
  if (market) return Boolean(await loadCredentials(parseMarketplace(market)));
  const [us, uk, ca] = await Promise.all([
    loadCredentials("US"),
    loadCredentials("UK"),
    loadCredentials("CA"),
  ]);
  return Boolean(us || uk || ca);
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(creds: Credentials): Promise<string> {
  const cacheKey = `${creds.version}:${creds.id}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const endpoint = tokenEndpointFor(creds.version);
  const lwa = isLwaVersion(creds.version);
  const fields = {
    grant_type: "client_credentials",
    client_id: creds.id,
    client_secret: creds.secret,
    scope: lwa ? "creatorsapi::default" : "creatorsapi/default",
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": lwa
          ? "application/json"
          : "application/x-www-form-urlencoded",
      },
      body: lwa ? JSON.stringify(fields) : new URLSearchParams(fields).toString(),
    });
  } catch {
    throw new Error("Could not reach Amazon's sign-in service for the Creators API.");
  }

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!res.ok || !data?.access_token) {
    throw new Error(
      "Amazon rejected the Creators API credentials. Check the credential ID, secret and version in Admin → Settings → API keys."
    );
  }
  const ttlSec = Math.max(60, Number(data.expires_in) || 3600);
  tokenCache.set(cacheKey, {
    token: data.access_token,
    // Refresh 60s early to avoid using a token that expires mid-request
    expiresAt: Date.now() + (ttlSec - 60) * 1000,
  });
  return data.access_token;
}

/**
 * Optional legacy env fallback. Prefer per-admin amazonTrackingId from the DB.
 * Never accept a partner tag from the public frontend.
 */
export function getEnvPartnerTagFallback(): string | null {
  return process.env.AMAZON_PARTNER_TAG?.trim() || null;
}

/** Extract ASIN from Amazon URL or raw ASIN string. */
export function extractAsin(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^[A-Z0-9]{10}$/i.test(raw)) return raw.toUpperCase();

  try {
    const url = new URL(raw);
    const dp = url.pathname.match(
      /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i
    );
    if (dp?.[1]) return dp[1].toUpperCase();
    const asinParam =
      url.searchParams.get("asin") || url.searchParams.get("ASIN");
    if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
      return asinParam.toUpperCase();
    }
  } catch {
    /* not a URL */
  }

  const loose = raw.match(/\b([A-Z0-9]{10})\b/i);
  return loose?.[1]?.toUpperCase() || null;
}

/**
 * Build / normalize an Associates affiliate URL for the given partner tag.
 * Always forces `tag=` to the admin's tracking ID (never trusts client input).
 * Non-Amazon hosts are ignored — we rebuild a clean /dp/{ASIN} link instead.
 */
export function buildAffiliateUrl(
  detailPageUrl: string | null,
  partnerTag: string,
  asin: string,
  marketplace: MarketplaceCode | string = "US"
) {
  const market = parseMarketplace(marketplace);
  const conf = MARKETPLACES[market];

  if (detailPageUrl) {
    try {
      const url = new URL(detailPageUrl);
      if (isAmazonRetailHost(url.hostname)) {
        url.searchParams.set("tag", partnerTag);
        return url.toString();
      }
    } catch {
      /* fall through */
    }
  }

  return `https://${conf.marketplaceHost}/dp/${asin}?tag=${encodeURIComponent(partnerTag)}`;
}

const GET_ITEMS_RESOURCES = [
  "offersV2.listings.price",
  "offersV2.listings.isBuyBoxWinner",
  "offersV2.listings.availability",
  "offersV2.listings.condition",
  "offersV2.listings.dealDetails",
  "offersV2.listings.type",
  "itemInfo.title",
  "itemInfo.features",
  "itemInfo.classifications",
  "images.primary.large",
  "images.primary.medium",
  "browseNodeInfo.browseNodes",
  "browseNodeInfo.browseNodes.ancestor",
];

type CreatorsItem = Record<string, unknown>;

type GetItemsOutcome = {
  items: Map<string, CreatorsItem>;
  /** ASIN → Amazon error code (e.g. ItemNotAccessible) */
  errors: Map<string, string>;
};

/** Raw GetItems call (max 10 ASINs per request, per Amazon's limit). */
async function getItems(
  asins: string[],
  partnerTag: string,
  market: MarketplaceCode
): Promise<GetItemsOutcome> {
  const creds = await loadCredentials(market);
  if (!creds) {
    throw new Error(
      `Amazon Creators API is not configured for ${MARKETPLACES[market].label}. A Super Admin can add credentials in Admin → Settings → API keys.`
    );
  }
  const token = await getAccessToken(creds);
  const marketplaceHost = MARKETPLACES[market].marketplaceHost;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}/getItems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: isLwaVersion(creds.version)
          ? `Bearer ${token}`
          : `Bearer ${token}, Version ${creds.version}`,
        "x-marketplace": marketplaceHost,
      },
      body: JSON.stringify({
        itemIds: asins.slice(0, 10),
        itemIdType: "ASIN",
        marketplace: marketplaceHost,
        partnerTag,
        resources: GET_ITEMS_RESOURCES,
      }),
    });
  } catch {
    throw new Error("Could not reach the Amazon Creators API.");
  }

  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (res.status === 401 || res.status === 403) {
    // Token may have been revoked — drop it so the next call re-authenticates
    tokenCache.delete(`${creds.version}:${creds.id}`);
    throw new Error(
      `Amazon denied the request (HTTP ${res.status}). Check that the Creators API credentials and your ${market} tracking ID belong to the same Associates store.`
    );
  }
  if (res.status === 429) {
    throw new Error("Amazon Creators API rate limit reached. Try again in a minute.");
  }
  if (!res.ok || !data) {
    throw new Error(`Amazon ${market} lookup failed (HTTP ${res.status}).`);
  }

  // The SDK model names the root "itemsResult"; accept the docs' variant too.
  const result = (data.itemsResult || data.itemResults) as
    | { items?: CreatorsItem[] }
    | undefined;
  const items = new Map<string, CreatorsItem>();
  for (const item of result?.items || []) {
    if (typeof item.asin === "string") items.set(item.asin.toUpperCase(), item);
  }
  const errors = new Map<string, string>();
  for (const err of (data.errors as
    | { code?: string; message?: string }[]
    | undefined) || []) {
    const asin = String(err.message || "").match(/\b([A-Z0-9]{10})\b/)?.[1];
    if (asin) errors.set(asin, err.code || "Error");
  }
  return { items, errors };
}

type BrowseNode = {
  id?: string;
  displayName?: string;
  contextFreeName?: string;
  isRoot?: boolean;
  ancestor?: BrowseNode;
};

function nodeName(node: BrowseNode | undefined): string {
  if (!node) return "";
  return (node.contextFreeName || node.displayName || "").trim();
}

function walkBrowseAncestors(node: BrowseNode): string[] {
  const names: string[] = [];
  let cur: BrowseNode | undefined = node;
  while (cur) {
    const n = nodeName(cur);
    if (n) names.push(n);
    cur = cur.ancestor;
  }
  return names.reverse();
}

/** Pick the deepest Amazon browse path (root → leaf). */
function extractBrowseCategoryPath(item: CreatorsItem): string[] {
  const browse = item.browseNodeInfo as
    | { browseNodes?: BrowseNode[] }
    | undefined;
  let best: string[] = [];
  for (const node of browse?.browseNodes || []) {
    const path = walkBrowseAncestors(node);
    if (path.length > best.length) best = path;
  }
  return best;
}

/**
 * Map one Creators API item to our lookup result.
 * Throws a field-specific error when something required is missing.
 */
export function parseCreatorsItem(
  item: CreatorsItem,
  partnerTag: string,
  market: MarketplaceCode
): AmazonLookupResult {
  const asin = String(item.asin || "").toUpperCase();
  const itemInfo = item.itemInfo as Record<string, unknown> | undefined;
  const title = (
    itemInfo?.title as { displayValue?: string } | undefined
  )?.displayValue?.trim();
  if (!title) throw new Error("Product title could not be retrieved.");

  const features =
    (itemInfo?.features as { displayValues?: string[] } | undefined)
      ?.displayValues || [];
  const description = features.join("\n").slice(0, 4000);
  if (!description.trim()) {
    throw new Error("Product description could not be retrieved.");
  }

  const images = item.images as
    | { primary?: { large?: { url?: string }; medium?: { url?: string } } }
    | undefined;
  const imageUrl =
    images?.primary?.large?.url || images?.primary?.medium?.url || "";
  if (!/^https:\/\//i.test(imageUrl)) {
    throw new Error("Product image could not be retrieved.");
  }

  const productGroup =
    (
      itemInfo?.classifications as
        | { productGroup?: { displayValue?: string } }
        | undefined
    )?.productGroup?.displayValue?.trim() || null;

  const browsePath = extractBrowseCategoryPath(item);
  const categoryPath =
    browsePath.length > 0 ? browsePath : productGroup ? [productGroup] : [];

  const apiDetailUrl =
    typeof item.detailPageURL === "string" ? item.detailPageURL : null;

  return {
    asin,
    discount: parseAmazonDiscount(item),
    title,
    description,
    imageUrl,
    detailPageUrl: buildAffiliateUrl(apiDetailUrl, partnerTag, asin, market),
    categoryPath,
    productGroup,
    marketplace: market,
  };
}

/**
 * Server-only Creators API GetItems lookup.
 * Accepts a full Amazon product URL **or** a bare 10-char ASIN.
 * `partnerTag` must be the authenticated admin's tracking ID for that marketplace.
 */
export async function lookupAmazonProduct(
  input: string,
  partnerTag: string,
  marketplace: MarketplaceCode | string = "US"
): Promise<AmazonLookupResult> {
  const asin = extractAsin(input);
  if (!asin) {
    throw new Error(
      "Enter a valid Amazon product URL or a 10-character ASIN (e.g. B0XXXXXXXX)."
    );
  }
  const tag = partnerTag.trim();
  if (!tag) {
    throw new Error(
      "Your Amazon Tracking ID has not been configured. Please contact the Super Admin."
    );
  }
  const market = parseMarketplace(marketplace);
  const { items, errors } = await getItems([asin], tag, market);
  const item = items.get(asin);
  if (!item) {
    const code = errors.get(asin);
    throw new Error(
      code === "ItemNotAccessible"
        ? `That product isn't available through the Creators API on ${MARKETPLACES[market].label}.`
        : `No product found for ${asin} on ${MARKETPLACES[market].label}.`
    );
  }
  return parseCreatorsItem(item, tag, market);
}

export type AmazonRefreshResult =
  | { asin: string; ok: true; data: AmazonLookupResult }
  | { asin: string; ok: false; unavailable: boolean; error: string };

/**
 * Batch refresh for the daily cron (≤10 ASINs per Amazon request).
 * `unavailable` = Amazon says the item is gone / not accessible.
 */
export async function refreshAmazonItems(
  asins: string[],
  partnerTag: string,
  market: MarketplaceCode
): Promise<AmazonRefreshResult[]> {
  const out: AmazonRefreshResult[] = [];
  for (let i = 0; i < asins.length; i += 10) {
    const batch = asins.slice(i, i + 10);
    const { items, errors } = await getItems(batch, partnerTag, market);
    for (const asin of batch) {
      const item = items.get(asin);
      if (!item) {
        out.push({
          asin,
          ok: false,
          unavailable: errors.has(asin),
          error: errors.get(asin) || "Not returned by Amazon",
        });
        continue;
      }
      try {
        out.push({ asin, ok: true, data: parseCreatorsItem(item, partnerTag, market) });
      } catch (e) {
        out.push({
          asin,
          ok: false,
          unavailable: false,
          error: e instanceof Error ? e.message : "Parse failed",
        });
      }
    }
  }
  return out;
}

/** Admin "Test connection": fetch a fresh token with the saved credentials. */
export async function verifyAmazonCredentials(
  market: MarketplaceCode
): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = await loadCredentials(market);
  if (!creds) {
    return { ok: false, error: `No ${market} Creators API credentials saved.` };
  }
  tokenCache.delete(`${creds.version}:${creds.id}`);
  try {
    await getAccessToken(creds);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sign-in failed." };
  }
}
