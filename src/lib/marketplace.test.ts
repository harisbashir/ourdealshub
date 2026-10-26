import assert from "node:assert/strict";
import { test } from "node:test";
import { detectMarketplaceFromInput, parseMarketplace, parseMarketplaceFilter, MARKETPLACES, marketplaceSocialLine } from "./marketplace";
import { appendMarketQuery, marketQuerySuffix } from "./market-preference";
import { normalizeAdminAffiliateUrl } from "./affiliate-url";

test("Canada has its own store, filters and normalized partner link", () => {
  assert.equal(parseMarketplace("ca"), "CA");
  assert.equal(parseMarketplaceFilter("CA"), "CA");
  assert.equal(MARKETPLACES.CA.retailHost, "amazon.ca");
  assert.match(marketplaceSocialLine("CA"), /Canada/);
  assert.equal(appendMarketQuery("/search?q=lamp", "CA"), "/search?q=lamp&market=CA");
  assert.equal(marketQuerySuffix("CA"), "?market=CA");
  const result = normalizeAdminAffiliateUrl({ affiliateUrl: "https://www.amazon.ca/dp/B000000001?tag=untrusted-20", asin: "B000000001", trackingId: "owner-ca-20", marketplace: "CA" });
  assert.equal(new URL(result.affiliateUrl).hostname, "www.amazon.ca");
  assert.equal(new URL(result.affiliateUrl).searchParams.get("tag"), "owner-ca-20");
});
test("Canada detection rejects spoofed and unrelated hosts", () => {
  assert.equal(detectMarketplaceFromInput("https://www.amazon.ca/dp/B000000001"), "CA");
  assert.equal(detectMarketplaceFromInput("https://amazon.ca.evil.com/dp/B000000001"), null);
  assert.equal(detectMarketplaceFromInput("https://amazon.com/dp/B000000001"), "US");
  assert.equal(detectMarketplaceFromInput("B000000001"), null);
});
