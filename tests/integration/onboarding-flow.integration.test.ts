import test from "node:test";
import assert from "node:assert/strict";

import { suggestTuitionCode } from "../../src/lib/tuition";
import { formatRollNumber } from "../../src/lib/students";

test("integration/onboarding: generated tuition code composes first roll number", () => {
  const code = suggestTuitionCode("Abhay Brilliant Classes");
  const roll = formatRollNumber(1, code);

  assert.equal(code, "ABC");
  assert.equal(roll, "ABC001");
});

test("integration/onboarding: sequence increments preserve prefix and padding", () => {
  const code = suggestTuitionCode("Prime Academy");
  const roll2 = formatRollNumber(2, code);
  const roll125 = formatRollNumber(125, code);

  assert.equal(code, "PAC");
  assert.equal(roll2, "PAC002");
  assert.equal(roll125, "PAC125");
});
