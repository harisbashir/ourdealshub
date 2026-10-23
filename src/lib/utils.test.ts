import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "./utils";

describe("slugify", () => {
  it("makes readable ASCII slugs", () => {
    assert.equal(slugify("  Wireless Earbuds, Pro (2nd Gen) "), "wireless-earbuds-pro-2nd-gen");
    assert.equal(slugify("Café Crème Mug"), "cafe-creme-mug");
    // Unchanged from earlier slugs so category matching keeps working
    assert.equal(slugify("Home & Kitchen"), "home-kitchen");
  });

  it("caps long titles at a word boundary", () => {
    const s = slugify(
      "Acme Ultra Quiet Portable Blender for Smoothies and Shakes with Six Stainless Steel Blades and USB-C Charging Cable Included"
    );
    assert.ok(s.length <= 80, s);
    assert.ok(!s.endsWith("-"), s);
    assert.ok(s.startsWith("acme-ultra-quiet-portable-blender"), s);
  });
});
