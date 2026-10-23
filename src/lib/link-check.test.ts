import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkCheckProbeUrl, shouldUnpublishAfterCheck } from "./link-check";

describe("linkCheckProbeUrl", () => {
  it("probes the untagged product page, never the Special Link", () => {
    assert.equal(
      linkCheckProbeUrl("https://www.amazon.com/dp/B0ABCDEFGH?tag=mine-20&linkCode=ll1"),
      "https://www.amazon.com/dp/B0ABCDEFGH"
    );
    assert.equal(
      linkCheckProbeUrl("https://www.amazon.co.uk/Some-Name/dp/B0ABCDEFGH/ref=x?tag=uk-21"),
      "https://www.amazon.co.uk/dp/B0ABCDEFGH"
    );
  });

  it("strips affiliate params when there is no ASIN", () => {
    const out = linkCheckProbeUrl("https://www.amazon.com/s?k=kettle&tag=mine-20") || "";
    assert.ok(!out.includes("tag="), out);
    assert.ok(out.includes("k=kettle"), out);
  });

  it("rejects non-Amazon URLs", () => {
    assert.equal(linkCheckProbeUrl("https://amazon.com.evil.example/dp/B0ABCDEFGH"), null);
  });
});

describe("shouldUnpublishAfterCheck", () => {
  const broken404 = { status: "broken" as const, detail: "HTTP 404" };

  it("only flags on the first 404", () => {
    assert.equal(shouldUnpublishAfterCheck("ok", broken404), false);
    assert.equal(shouldUnpublishAfterCheck("unknown", broken404), false);
    assert.equal(shouldUnpublishAfterCheck(null, broken404), false);
  });

  it("unpublishes on the second consecutive 404", () => {
    assert.equal(shouldUnpublishAfterCheck("broken", broken404), true);
  });

  it("unpublishes unsafe URLs immediately", () => {
    assert.equal(
      shouldUnpublishAfterCheck("ok", {
        status: "broken",
        detail: "Not a safe Amazon URL",
      }),
      true
    );
  });

  it("never unpublishes for ok / unknown", () => {
    assert.equal(
      shouldUnpublishAfterCheck("broken", { status: "ok", detail: "HTTP 200" }),
      false
    );
    assert.equal(
      shouldUnpublishAfterCheck("broken", {
        status: "unknown",
        detail: "HTTP 503",
      }),
      false
    );
  });
});
