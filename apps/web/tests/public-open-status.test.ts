import test from "node:test";
import assert from "node:assert/strict";
import { getPublicOpenStatus } from "../components/public/public-page-utils";
import type { PublicWorkingHour } from "../components/public/types";

function hours(dayOfWeek: number, opensAt: string | null, closesAt: string | null, secondOpensAt: string | null = null, secondClosesAt: string | null = null, isClosed = false): PublicWorkingHour {
  return { id: `day-${dayOfWeek}`, dayOfWeek, opensAt, closesAt, secondOpensAt, secondClosesAt, isClosed };
}

// 2026-08-17 is Monday. These UTC instants are chosen so their Riyadh local
// times exercise the public status logic deterministically.
test("keeps an overnight Monday shift open before midnight", () => {
  const status = getPublicOpenStatus(
    [hours(0, "20:00", "02:00")],
    new Date("2026-08-17T18:00:00Z"), // Monday 21:00 Riyadh
  );
  assert.equal(status.label, "مفتوح الآن");
  assert.match(status.detail ?? "", /يغلق الساعة/);
});

test("keeps the previous day's overnight shift open after midnight", () => {
  const status = getPublicOpenStatus(
    [hours(0, "20:00", "02:00"), hours(1, "20:00", "02:00")],
    new Date("2026-08-17T21:30:00Z"), // Tuesday 00:30 Riyadh
  );
  assert.equal(status.label, "مفتوح الآن");
  assert.match(status.detail ?? "", /يغلق الساعة/);
});

test("closes after an overnight shift ends and points to today's next opening", () => {
  const status = getPublicOpenStatus(
    [hours(0, "20:00", "02:00"), hours(1, "20:00", "02:00")],
    new Date("2026-08-17T23:30:00Z"), // Tuesday 02:30 Riyadh
  );
  assert.equal(status.label, "مغلق الآن");
  assert.match(status.detail ?? "", /يفتح الساعة/);
});

test("handles a split shift between the morning and evening windows", () => {
  const status = getPublicOpenStatus(
    [hours(0, "08:00", "12:00", "16:00", "20:00")],
    new Date("2026-08-17T10:00:00Z"), // Monday 13:00 Riyadh
  );
  assert.equal(status.label, "مغلق الآن");
  assert.match(status.detail ?? "", /يفتح الساعة/);
});

test("names the next opening day when the business is closed for more than one day", () => {
  const status = getPublicOpenStatus(
    [
      hours(0, null, null, null, null, true),
      hours(1, null, null, null, null, true),
      hours(2, "09:00", "17:00"),
    ],
    new Date("2026-08-17T09:00:00Z"), // Monday 12:00 Riyadh
  );
  assert.equal(status.label, "مغلق الآن");
  assert.match(status.detail ?? "", /الأربعاء/);
});
