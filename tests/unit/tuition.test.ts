import test from "node:test";
import assert from "node:assert/strict";

import { suggestTuitionCode } from "../../src/lib/tuition";

test("suggestTuitionCode creates acronym from three words", () => {
  assert.equal(suggestTuitionCode("Abhay Brilliant Classes"), "ABC");
});

test("suggestTuitionCode uses first word + two letters for two words", () => {
  assert.equal(suggestTuitionCode("Prime Academy"), "PAC");
});

test("suggestTuitionCode truncates single word and uppercases", () => {
  assert.equal(suggestTuitionCode("zenith"), "ZEN");
});

test("suggestTuitionCode removes non letters and pads fallback", () => {
  assert.equal(suggestTuitionCode("a$"), "AXX");
});

test("suggestTuitionCode trims and collapses extra spaces", () => {
  assert.equal(suggestTuitionCode("   Abhay     Brilliant   Classes   "), "ABC");
});

test("suggestTuitionCode ignores punctuation and numbers", () => {
  assert.equal(suggestTuitionCode("Class 101 @ Zenith!"), "CZE");
});

test("suggestTuitionCode pads with X when input has no letters", () => {
  assert.equal(suggestTuitionCode("1234 @@@"), "XXX");
});

test("suggestTuitionCode handles two-word second token of single char", () => {
  assert.equal(suggestTuitionCode("Prime A"), "PAX");
});
