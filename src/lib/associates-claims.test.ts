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

  it("blocks reviews, ratings, badges, shipping and urgency", () => {
    assert.equal(findAssociatesClaim("Rated 4.5 out of 5"), "star ratings");
    assert.equal(findAssociatesClaim("Sits at 4.6 stars"), "star ratings");
    assert.equal(findAssociatesClaim("A five-star rated blender"), "star ratings");
    assert.equal(findAssociatesClaim("Over 12,000 reviews"), "review counts");
    assert.equal(findAssociatesClaim("Customers love it per customer reviews"), "customer review mentions");
    assert.equal(findAssociatesClaim("An Amazon's Choice pick"), "“Amazon's Choice” badges");
    assert.equal(findAssociatesClaim("The best-selling kettle"), "best-seller claims");
    assert.equal(findAssociatesClaim("#1 Best Seller in Kitchen"), "best-seller claims");
    assert.equal(findAssociatesClaim("Prime eligible"), "Prime claims");
    assert.equal(findAssociatesClaim("Comes with free shipping"), "shipping claims");
    assert.equal(findAssociatesClaim("Today only!"), "urgency claims");
    assert.equal(findAssociatesClaim("The cheapest option"), "price claims");
    assert.equal(findAssociatesClaim("We tested it for a week"), "first-hand testing claims");
  });

  it("does not flag ordinary product facts", () => {
    for (const ok of [
      "Includes 2 stars-and-moon night light covers",
      "Rated IP67 for water resistance",
      "5 GHz Wi-Fi with 4 antennas",
      "Ships with a USB-C cable",
      "Top-loading design for easy filling",
      "Pack of 3 replacement filters",
    ]) {
      assert.equal(findAssociatesClaim(ok), null, ok);
    }
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
