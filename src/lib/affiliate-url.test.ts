import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAmazonCdnImageUrl,
  isAmazonProductUrl,
  isSafeAffiliateRedirectUrl,
  normalizeAdminAffiliateUrl,
} from "./affiliate-url";

describe("affiliate-url", () => {
  it("accepts amazon product hosts", () => {
    assert.equal(
      isAmazonProductUrl("https://www.amazon.com/dp/B0TESTASIN"),
      true
    );
    assert.equal(isAmazonProductUrl("https://evil.example/dp/B0TESTASIN"), false);
  });

  it("accepts amazon CDN image hosts only", () => {
    assert.equal(
      isAmazonCdnImageUrl(
        "https://m.media-amazon.com/images/I/example.jpg"
      ),
      true
    );
    assert.equal(
      isAmazonCdnImageUrl("https://cdn.example.com/images/I/example.jpg"),
      false
    );
  });

  it("blocks open redirects off Amazon", () => {
    assert.equal(
      isSafeAffiliateRedirectUrl("https://www.amazon.com/dp/B0TESTASIN0?tag=x"),
      true
    );
    assert.equal(
      isSafeAffiliateRedirectUrl("https://phishing.example/go"),
      false
    );
  });

  it("rebuilds affiliate URLs with the admin tracking id", () => {
    const result = normalizeAdminAffiliateUrl({
      affiliateUrl: "https://www.amazon.com/dp/B0TESTASI0?tag=other-20",
      asin: "B0TESTASI0",
      trackingId: "ourdealshub-20",
      marketplace: "US",
    });
    assert.equal(result.asin, "B0TESTASI0");
    assert.match(result.affiliateUrl, /tag=ourdealshub-20/);
    assert.doesNotMatch(result.affiliateUrl, /tag=other-20/);
  });
});
