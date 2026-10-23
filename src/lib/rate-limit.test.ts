import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIp, rateLimit } from "./rate-limit";

describe("rate-limit", () => {
  it("enforces a sliding window", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    assert.equal(rateLimit(key, 2, 60_000).ok, true);
    assert.equal(rateLimit(key, 2, 60_000).ok, true);
    assert.equal(rateLimit(key, 2, 60_000).ok, false);
  });

  it("prefers x-real-ip and rightmost x-forwarded-for", () => {
    assert.equal(
      clientIp(
        new Request("http://localhost", {
          headers: {
            "x-forwarded-for": "1.1.1.1, 2.2.2.2",
            "x-real-ip": "9.9.9.9",
          },
        })
      ),
      "9.9.9.9"
    );
    assert.equal(
      clientIp(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "spoofed, 8.8.8.8" },
        })
      ),
      "8.8.8.8"
    );
  });
});
