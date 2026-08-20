import test from "node:test";
import assert from "node:assert/strict";
import { bookingIntervalsOverlap, bookingMinutes, bookingWithinWorkingHours, normalizedBookingDuration } from "../app/lib/booking-time";

const schedule = { opensAt: "09:00", closesAt: "17:00", secondOpensAt: null, secondClosesAt: null, isClosed: false };

test("requires the full service duration to fit inside working hours", () => {
  assert.equal(bookingWithinWorkingHours("16:00", 60, schedule), true);
  assert.equal(bookingWithinWorkingHours("16:30", 60, schedule), false);
  assert.equal(bookingWithinWorkingHours("08:30", 30, schedule), false);
});

test("supports split working hours", () => {
  const split = { opensAt: "09:00", closesAt: "12:00", secondOpensAt: "16:00", secondClosesAt: "21:00", isClosed: false };
  assert.equal(bookingWithinWorkingHours("11:30", 30, split), true);
  assert.equal(bookingWithinWorkingHours("12:00", 30, split), false);
  assert.equal(bookingWithinWorkingHours("16:00", 90, split), true);
});

test("rejects missing and closed schedules", () => {
  assert.equal(bookingWithinWorkingHours("10:00", 30, null), false);
  assert.equal(bookingWithinWorkingHours("10:00", 30, { ...schedule, isClosed: true }), false);
});

test("detects overlapping bookings but allows touching boundaries", () => {
  const ten = bookingMinutes("10:00");
  assert.equal(bookingIntervalsOverlap(ten, 60, bookingMinutes("10:30"), 30), true);
  assert.equal(bookingIntervalsOverlap(ten, 60, bookingMinutes("11:00"), 30), false);
  assert.equal(bookingIntervalsOverlap(bookingMinutes("09:30"), 30, ten, 60), false);
});

test("uses a safe default duration for legacy or invalid service durations", () => {
  assert.equal(normalizedBookingDuration(null), 30);
  assert.equal(normalizedBookingDuration(0), 30);
  assert.equal(normalizedBookingDuration(4), 30);
  assert.equal(normalizedBookingDuration(45), 45);
});
