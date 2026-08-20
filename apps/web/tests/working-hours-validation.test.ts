import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkingHoursWindow } from "../app/lib/working-hours-validation";

test("accepts a normal daytime window", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "08:00", closesAt: "17:00" }), true);
});

test("accepts an overnight window", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "20:00", closesAt: "02:00" }), true);
});

test("rejects a zero-length window that booking logic could interpret as 24 hours", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "09:00", closesAt: "09:00" }), false);
});

test("accepts two separated shifts", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "08:00", closesAt: "12:00", secondOpensAt: "16:00", secondClosesAt: "20:00" }), true);
});

test("rejects overlapping daytime shifts", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "08:00", closesAt: "17:00", secondOpensAt: "16:00", secondClosesAt: "20:00" }), false);
});

test("rejects overlap across midnight", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "20:00", closesAt: "02:00", secondOpensAt: "01:00", secondClosesAt: "03:00" }), false);
});

test("allows an adjacent second shift", () => {
  assert.equal(validateWorkingHoursWindow({ opensAt: "08:00", closesAt: "12:00", secondOpensAt: "12:00", secondClosesAt: "16:00" }), true);
});
