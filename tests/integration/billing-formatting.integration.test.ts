import test from "node:test";
import assert from "node:assert/strict";

import { formatTimeRange, formatPeriod, getPeriodString } from "../../src/lib/utils";

test("integration/billing-formatting: period key -> label and slot text", () => {
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

test("integration/billing-formatting: early-month dates stay zero-padded", () => {
  const period = getPeriodString(new Date("2026-01-02T12:00:00.000Z"));
  const periodLabel = formatPeriod(period);

  assert.equal(period, "2026-01");
  assert.equal(periodLabel, "January 2026");
});
