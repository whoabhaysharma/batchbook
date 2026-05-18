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
