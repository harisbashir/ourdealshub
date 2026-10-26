import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAmazonDiscount, discountFields, visibleDiscount, sampleSavings } from "./amazon-discounts";

const now = new Date("2026-10-26T12:00:00Z");
const featured = { isBuyBoxWinner: true, violatesMAP: false, condition: { value: "New" }, availability: { type: "IN_STOCK" },
  price: { savings: { percentage: 25 }, savingBasis: { savingBasisTypeLabel: "List Price" } } };
const item = (offer: object) => ({ offersV2: { listings: [offer] } });

test("only the featured offer supplies Amazon savings; never choose the biggest discount", () => {
  const discount = parseAmazonDiscount({ offersV2: { listings: [{ ...featured, isBuyBoxWinner: false, price: { savings: { percentage: 80 } } }, featured] } }, now)!;
  assert.equal(discount.percent, 25); assert.equal(discount.basis, "List Price");
  assert.equal(discount.expiresAt.getTime() - now.getTime(), 86400_000);
  assert.equal(parseAmazonDiscount(item({ ...featured, isBuyBoxWinner: false }), now), null);
});
test("hide restricted, unavailable, used, subscription and MAP-protected offers", () => {
  for (const change of [{ violatesMAP: true }, { violatesMAP: undefined }, { condition: { value: "Used" } },
    { availability: { type: "OUT_OF_STOCK" } }, { type: "SUBSCRIBE_AND_SAVE" }, { dealDetails: { accessType: "PRIME_EXCLUSIVE" } }]) {
    assert.equal(parseAmazonDiscount(item({ ...featured, ...change }), now), null);
  }
});
test("promotion start/end times limit the badge, malformed dates cannot create evergreen savings", () => {
  const ends = "2026-10-26T13:00:00Z";
  assert.equal(parseAmazonDiscount(item({ ...featured, dealDetails: { endTime: ends } }), now)!.expiresAt.toISOString(), "2026-10-26T13:00:00.000Z");
  for (const dealDetails of [{ startTime: ends }, { endTime: now.toISOString() }, { endTime: "invalid" }, { startTime: "invalid" }]) {
    assert.equal(parseAmazonDiscount(item({ ...featured, dealDetails }), now), null);
  }
});
test("missing, zero, inflated or malformed savings disappear without inventing a percentage", () => {
  assert.equal(parseAmazonDiscount({}, now), null);
  for (const percentage of [0, 100, -10, 25.5, "30", NaN, undefined]) {
    assert.equal(parseAmazonDiscount(item({ ...featured, price: { savings: { percentage }, savingBasis: { savingBasisTypeLabel: "List Price" } } }), now), null);
  }
  assert.equal(parseAmazonDiscount(item({ ...featured, price: { savings: { percentage: 25 } } }), now), null);
});
test("serialized Saved cards and open tabs reject stale, expired and future-dated discounts", () => {
  const fields = discountFields(parseAmazonDiscount(item(featured), now));
  const saved = JSON.parse(JSON.stringify(fields));
  assert.equal(visibleDiscount(saved, now.getTime()), 25);
  assert.equal(visibleDiscount(saved, now.getTime() + 86400_000), null);
  assert.equal(visibleDiscount(saved, now.getTime() - 1), null);
  assert.equal(visibleDiscount({ ...saved, discountExpiresAt: now.toISOString() }, now.getTime()), null);
  assert.equal(visibleDiscount(discountFields(null), now.getTime()), null);
  assert.equal(sampleSavings("sample-ca-headphones"), 30);
  assert.equal(sampleSavings("real-product"), null);
});
