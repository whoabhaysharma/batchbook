import test from "node:test";
import assert from "node:assert/strict";

import { formatRollNumber } from "../../src/lib/students";

test("formatRollNumber left pads to three digits", () => {
  assert.equal(formatRollNumber(7, "ABC"), "ABC007");
});

test("formatRollNumber keeps larger numbers without truncation", () => {
  assert.equal(formatRollNumber(1205, "ABC"), "ABC1205");
});

test("formatRollNumber supports zero sequence", () => {
  assert.equal(formatRollNumber(0, "ABC"), "ABC000");
});

test("formatRollNumber does not modify prefix casing", () => {
  assert.equal(formatRollNumber(5, "abC"), "abC005");
});
