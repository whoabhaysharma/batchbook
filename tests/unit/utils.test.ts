import test from "node:test";
import assert from "node:assert/strict";

import { formatTimeRange, formatTimeSlot, formatPeriod, getPeriodString } from "../../src/lib/utils";

test("formatTimeSlot pads hour and minute", () => {
  assert.equal(formatTimeSlot({ hour: 9, minute: 5, period: "AM" }), "09:05 AM");
});

test("formatTimeRange returns Flexible when start or end missing", () => {
  assert.equal(formatTimeRange(undefined as any, { hour: 10, minute: 0, period: "AM" }), "Flexible");
  assert.equal(formatTimeRange({ hour: 9, minute: 0, period: "AM" }, undefined as any), "Flexible");
});

test("formatPeriod converts valid YYYY-MM format to human label", () => {
  assert.equal(formatPeriod("2026-05"), "May 2026");
});

test("formatPeriod returns raw input for invalid values", () => {
  assert.equal(formatPeriod(""), "");
  assert.equal(formatPeriod("202605"), "202605");
});

test("getPeriodString returns zero-padded month", () => {
  assert.equal(getPeriodString(new Date("2026-01-15T00:00:00.000Z")), "2026-01");
});
