import { createHmac, createHash } from "crypto";
import { isAmazonRetailHost } from "@/lib/amazon-hosts";
import {
  MARKETPLACES,
  parseMarketplace,
  type MarketplaceCode,
} from "@/lib/marketplace";

export type AmazonLookupResult = {
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

export type AmazonFetchFailure = {
  field: "title" | "description" | "image" | "affiliate" | "asin" | "api";
  message: string;
};

function requireAmazonCredentials(marketplace: MarketplaceCode) {
  const accessKey = process.env.AMAZON_ACCESS_KEY?.trim();
  const secretKey = process.env.AMAZON_SECRET_KEY?.trim();
  const conf = MARKETPLACES[marketplace];

  // Allow env override for US (legacy .env); UK always uses locale defaults
  // unless AMAZON_PAAPI_HOST_UK / REGION_UK are set.
  let host = conf.paapiHost;
  let region = conf.region;
  if (marketplace === "US") {
    host = process.env.AMAZON_PAAPI_HOST?.trim() || host;
    region = process.env.AMAZON_PAAPI_REGION?.trim() || region;
  } else if (marketplace === "UK") {
    host = process.env.AMAZON_PAAPI_HOST_UK?.trim() || host;
    region = process.env.AMAZON_PAAPI_REGION_UK?.trim() || region;
  }

  if (!accessKey || !secretKey) {
    throw new Error(
      "Amazon Product Advertising API is not configured. Ask the Super Admin to set server credentials."
    );
  }

  return { accessKey, secretKey, host, region, conf };
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

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function hashSha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function signPaapiRequest(
  body: string,
  host: string,
  region: string,
  accessKey: string,
  secretKey: string
) {
  const service = "ProductAdvertisingAPI";
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = "/paapi5/getitems";
  const canonicalQuerystring = "";
  const payloadHash = hashSha256(body);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
  const signedHeaders =
    "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashSha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { amzDate, authorization, canonicalUri };
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

/** API credentials only — partner tags come from each admin's DB record. */
export function isAmazonConfigured() {
  return Boolean(
    process.env.AMAZON_ACCESS_KEY?.trim() &&
      process.env.AMAZON_SECRET_KEY?.trim()
  );
}

/**
 * Server-only Amazon PA-API GetItems lookup.
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
  const { accessKey, secretKey, host, region, conf } =
    requireAmazonCredentials(market);

  const payload = {
    ItemIds: [asin],
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.Features",
      "ItemInfo.Classifications.ProductGroup",
      "Images.Primary.Large",
      "Images.Primary.Medium",
      "BrowseNodeInfo.BrowseNodes",
      "BrowseNodeInfo.BrowseNodes.Ancestor",
    ],
    PartnerTag: tag,
    PartnerType: "Associates",
    Marketplace: conf.marketplaceHost,
  };

  const body = JSON.stringify(payload);
  const { amzDate, authorization, canonicalUri } = signPaapiRequest(
    body,
    host,
    region,
    accessKey,
    secretKey
  );

  let response: Response;
  try {
    response = await fetch(`https://${host}${canonicalUri}`, {
      method: "POST",
      headers: {
        "content-encoding": "amz-1.0",
        "content-type": "application/json; charset=utf-8",
        host,
        "x-amz-date": amzDate,
        "x-amz-target":
          "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
        Authorization: authorization,
      },
      body,
    });
  } catch {
    throw new Error("Could not reach Amazon Product Advertising API.");
  }

  const data = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok) {
    throw new Error(
      `Amazon ${market} lookup failed. Check ASIN/URL, marketplace, and Associates API credentials.`
    );
  }

  const itemsResult = data?.ItemsResult as
    | { Items?: Array<Record<string, unknown>> }
    | undefined;
  const item = itemsResult?.Items?.[0];
  if (!item) {
    throw new Error(`No product found for that ASIN on ${conf.label}.`);
  }

  const itemInfo = item.ItemInfo as Record<string, unknown> | undefined;
  const titleObj = itemInfo?.Title as { DisplayValue?: string } | undefined;
  const features = itemInfo?.Features as
    | { DisplayValues?: string[] }
    | undefined;
  const images = item.Images as
    | { Primary?: { Large?: { URL?: string }; Medium?: { URL?: string } } }
    | undefined;

  const title = titleObj?.DisplayValue?.trim();
  if (!title) {
    throw new Error("Product title could not be retrieved.");
  }

  const description = (features?.DisplayValues || []).join("\n").slice(0, 4000);
  if (!description.trim()) {
    throw new Error("Product description could not be retrieved.");
  }

  const imageUrl =
    images?.Primary?.Large?.URL || images?.Primary?.Medium?.URL || "";
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error("Product image could not be retrieved.");
  }

  const classifications = itemInfo?.Classifications as
    | { ProductGroup?: { DisplayValue?: string } }
    | undefined;
  const productGroup =
    classifications?.ProductGroup?.DisplayValue?.trim() || null;

  const categoryPath = extractBrowseCategoryPath(item) ||
    (productGroup ? [productGroup] : []);

  const apiDetailUrl =
    typeof item.DetailPageURL === "string" ? item.DetailPageURL : null;

  const affiliateUrl = buildAffiliateUrl(apiDetailUrl, tag, asin, market);
  if (!affiliateUrl || !/^https?:\/\//i.test(affiliateUrl)) {
    throw new Error("Affiliate link could not be created/verified.");
  }

  return {
    asin,
    title,
    description,
    imageUrl,
    detailPageUrl: affiliateUrl,
    categoryPath,
    productGroup,
    marketplace: market,
  };
}

type BrowseNode = {
  Id?: string;
  DisplayName?: string;
  ContextFreeName?: string;
  IsRoot?: boolean;
  Ancestor?: BrowseNode;
};

function nodeName(node: BrowseNode | undefined): string {
  if (!node) return "";
  return (node.ContextFreeName || node.DisplayName || "").trim();
}

function walkBrowseAncestors(node: BrowseNode): string[] {
  const names: string[] = [];
  let cur: BrowseNode | undefined = node;
  while (cur) {
    const n = nodeName(cur);
    if (n) names.push(n);
    cur = cur.Ancestor;
  }
  return names.reverse();
}

/** Pick the deepest Amazon browse path (root → leaf). */
function extractBrowseCategoryPath(
  item: Record<string, unknown>
): string[] {
  const browse = item.BrowseNodeInfo as
    | { BrowseNodes?: BrowseNode[] }
    | undefined;
  const nodes = browse?.BrowseNodes || [];
  if (!nodes.length) return [];

  let best: string[] = [];
  for (const node of nodes) {
    const path = walkBrowseAncestors(node);
    if (path.length > best.length) best = path;
  }
  return best;
}
