import test from "node:test";
import assert from "node:assert/strict";
import { validateLaundrySignature, validateLaundryContractDates } from "../app/lib/laundry-contract-domain";
test("contract signature validates bounded stroke coordinates and rejects empty marks", () => {
  const ink = [[[10, 10], [20, 20], [30, 10], [40, 20], [50, 10], [60, 20], [70, 10], [80, 20]]];
  assert.deepEqual(validateLaundrySignature(ink), ink);
  for (const bad of [[], [[]], [[[1, 1]]], [Array.from({ length: 10 }, () => [1, 1])], [[[1001, 0], [20, 20]]], [[[1, -1], [20, 20]]], [Array.from({ length: 301 }, (_, i) => [i, i % 30])], "<svg onload=alert(1)>"]) assert.throws(() => validateLaundrySignature(bad));
});
test("contract dates accept same-day terms but reject reversed and impossible dates", () => {
  assert.equal(validateLaundryContractDates("2026-10-21", "2026-10-21").from.toISOString(), "2026-10-20T21:00:00.000Z");
  assert.throws(() => validateLaundryContractDates("2026-10-22", "2026-10-21"));
  assert.throws(() => validateLaundryContractDates("2026-02-30", "2026-03-01"));
});
