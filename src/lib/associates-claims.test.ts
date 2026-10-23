import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  associatesClaimError,
  findAssociatesClaim,
} from "./associates-claims";

describe("associates-claims", () => {
  it("blocks bare dollar and pound prices", () => {
    assert.equal(findAssociatesClaim("Only $49.99 today"), "dollar price amounts");
    assert.equal(findAssociatesClaim("Now £19.99"), "pound price amounts");
    assert.equal(findAssociatesClaim("Save 20% off"), "percentage-off claims");
    assert.equal(findAssociatesClaim("Best deal ever"), "“best deal” claims");
  });

  it("allows factual copy without prices", () => {
    assert.equal(
      findAssociatesClaim("Compact wireless charger with USB-C cable included."),
      null
    );
    assert.equal(
      associatesClaimError({
        title: "USB-C Hub",
        description: "Four ports for travel laptops.",
      }),
      null
    );
  });
});
