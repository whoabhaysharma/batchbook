import test from "node:test";
import assert from "node:assert/strict";

import { suggestTuitionCode } from "../../src/lib/tuition";
import { formatRollNumber } from "../../src/lib/students";
import { formatTimeRange, formatPeriod, getPeriodString } from "../../src/lib/utils";

test("integration: setup naming + first roll number convention", () => {
  const code = suggestTuitionCode("Abhay Brilliant Classes");
  const roll = formatRollNumber(1, code);

  assert.equal(code, "ABC");
  assert.equal(roll, "ABC001");
});

test("integration: schedule and period formatting for invoicing view", () => {
  const period = getPeriodString(new Date("2026-05-18T00:00:00.000Z"));
  const periodLabel = formatPeriod(period);
  const slot = formatTimeRange(
    { hour: 9, minute: 0, period: "AM" },
    { hour: 10, minute: 30, period: "AM" }
  );

  assert.equal(period, "2026-05");
  assert.equal(periodLabel, "May 2026");
  assert.equal(slot, "09:00 AM - 10:30 AM");
});
