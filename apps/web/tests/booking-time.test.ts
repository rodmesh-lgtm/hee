import test from "node:test";
import assert from "node:assert/strict";
import { bookingIntervalsOverlap, bookingMinutes, bookingWithinPreviousOvernightWorkingHours, bookingWithinWorkingHours, normalizedBookingDuration } from "../app/lib/booking-time";

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

test("anchors an overnight shift to the day on which it starts", () => {
  const overnight = { opensAt: "20:00", closesAt: "02:00", secondOpensAt: null, secondClosesAt: null, isClosed: false };
  assert.equal(bookingWithinWorkingHours("21:00", 60, overnight), true);
  assert.equal(bookingWithinWorkingHours("01:00", 30, overnight), false);
  assert.equal(bookingWithinPreviousOvernightWorkingHours("01:00", 30, overnight), true);
  assert.equal(bookingWithinPreviousOvernightWorkingHours("21:00", 30, overnight), false);
});

test("uses only the previous day's overnight interval after midnight", () => {
  const mixed = { opensAt: "08:00", closesAt: "12:00", secondOpensAt: "20:00", secondClosesAt: "02:00", isClosed: false };
  assert.equal(bookingWithinPreviousOvernightWorkingHours("01:00", 30, mixed), true);
  assert.equal(bookingWithinPreviousOvernightWorkingHours("09:00", 30, mixed), false);
});

test("rejects zero-length legacy windows", () => {
  const invalid = { opensAt: "09:00", closesAt: "09:00", secondOpensAt: null, secondClosesAt: null, isClosed: false };
  assert.equal(bookingWithinWorkingHours("09:00", 30, invalid), false);
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

test("detects overlap when starts are expressed across adjacent calendar days", () => {
  const monday2330 = bookingMinutes("23:30");
  const tuesday0000 = 1440 + bookingMinutes("00:00");
  assert.equal(bookingIntervalsOverlap(monday2330, 60, tuesday0000, 30), true);
  assert.equal(bookingIntervalsOverlap(monday2330, 30, tuesday0000, 30), false);
});

test("uses a safe default duration for legacy or invalid service durations", () => {
  assert.equal(normalizedBookingDuration(null), 30);
  assert.equal(normalizedBookingDuration(0), 30);
  assert.equal(normalizedBookingDuration(4), 30);
  assert.equal(normalizedBookingDuration(45), 45);
});
