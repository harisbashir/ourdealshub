import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLwaVersion, parseCreatorsItem, tokenEndpointFor } from "./amazon";

describe("Creators API auth", () => {
  it("maps credential versions to Amazon's token endpoints", () => {
    assert.equal(tokenEndpointFor("3.1"), "https://api.amazon.com/auth/o2/token");
    assert.equal(tokenEndpointFor("3.2"), "https://api.amazon.co.uk/auth/o2/token");
    assert.equal(
      tokenEndpointFor("2.1"),
      "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token"
    );
    assert.throws(() => tokenEndpointFor("9.9"), /Unsupported/);
  });

  it("knows which versions use Login with Amazon", () => {
    assert.equal(isLwaVersion("3.2"), true);
    assert.equal(isLwaVersion("2.2"), false);
  });
});

// Shape per the Creators API GetItems / BrowseNodeInfo / Images references
const sampleItem = {
  asin: "B0ABCDEFGH",
  detailPageURL:
    "https://www.amazon.com/dp/B0ABCDEFGH?tag=someone-20&linkCode=ogi&th=1&psc=1",
  images: {
    primary: {
      large: { url: "https://m.media-amazon.com/images/I/abc._SL500_.jpg", height: 500, width: 500 },
      medium: { url: "https://m.media-amazon.com/images/I/abc._SL160_.jpg", height: 160, width: 160 },
    },
  },
  itemInfo: {
    title: { displayValue: "Acme Kettle 1.7L", label: "Title", locale: "en_US" },
    features: { displayValues: ["Boils in 3 minutes", "Auto shut-off"], label: "Features" },
    classifications: { productGroup: { displayValue: "Kitchen" } },
  },
  browseNodeInfo: {
    browseNodes: [
      { id: "1", displayName: "Kettles", contextFreeName: "Electric Kettles", isRoot: false,
        ancestor: { id: "2", displayName: "Small Appliances", contextFreeName: "Small Appliances",
          ancestor: { id: "3", displayName: "Kitchen & Dining", contextFreeName: "Kitchen & Dining", isRoot: true } } },
      { id: "9", displayName: "Gifts", contextFreeName: "Gifts", isRoot: true },
    ],
  },
};

describe("parseCreatorsItem", () => {
  it("maps title, features, image, browse path and forces our tag", () => {
    const r = parseCreatorsItem(sampleItem, "mine-20", "US");
    assert.equal(r.asin, "B0ABCDEFGH");
    assert.equal(r.title, "Acme Kettle 1.7L");
    assert.equal(r.description, "Boils in 3 minutes\nAuto shut-off");
    assert.equal(r.imageUrl, "https://m.media-amazon.com/images/I/abc._SL500_.jpg");
    assert.deepEqual(r.categoryPath, ["Kitchen & Dining", "Small Appliances", "Electric Kettles"]);
    assert.equal(r.productGroup, "Kitchen");
    assert.equal(new URL(r.detailPageUrl).searchParams.get("tag"), "mine-20");
  });

  it("falls back to product group when there are no browse nodes", () => {
    const r = parseCreatorsItem({ ...sampleItem, browseNodeInfo: undefined }, "mine-20", "US");
    assert.deepEqual(r.categoryPath, ["Kitchen"]);
  });

  it("rejects items missing required fields", () => {
    assert.throws(
      () => parseCreatorsItem({ ...sampleItem, images: {} }, "mine-20", "US"),
      /image/
    );
    assert.throws(
      () => parseCreatorsItem({ ...sampleItem, itemInfo: { title: { displayValue: "X" } } }, "mine-20", "US"),
      /description/
    );
  });
});
