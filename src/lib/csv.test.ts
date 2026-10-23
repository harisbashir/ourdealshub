import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvEscape } from "./csv";

describe("csvEscape", () => {
  it("leaves plain values alone", () => {
    assert.equal(csvEscape("Echo Dot"), "Echo Dot");
    assert.equal(csvEscape(42), "42");
    assert.equal(csvEscape(null), "");
  });

  it("quotes commas, quotes and newlines", () => {
    assert.equal(csvEscape('a,b'), '"a,b"');
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
    assert.equal(csvEscape("line1\nline2"), '"line1\nline2"');
  });

  it("neutralises spreadsheet formulas", () => {
    assert.equal(csvEscape("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
    assert.equal(csvEscape("+1+1"), "'+1+1");
    assert.equal(csvEscape("@SUM(A1)"), "'@SUM(A1)");
    assert.equal(csvEscape("-2+3"), "'-2+3");
  });

  it("does not mangle plain negative numbers", () => {
    assert.equal(csvEscape("-5"), "-5");
    assert.equal(csvEscape(-1.5), "-1.5");
  });
});
