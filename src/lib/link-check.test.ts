import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldUnpublishAfterCheck } from "./link-check";

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
