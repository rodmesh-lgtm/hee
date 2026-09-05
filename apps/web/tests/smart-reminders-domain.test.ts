import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReminderRecurrence, normalizeReminderTimezone, reminderDeliveryIdempotencyKey, validateReminderSchedule } from "../app/lib/reminders/domain";

test("smart reminders accept real IANA timezones and reject invalid zones", () => {
  assert.equal(normalizeReminderTimezone("Asia/Riyadh"), "Asia/Riyadh");
  assert.equal(normalizeReminderTimezone("America/New_York"), "America/New_York");
  assert.throws(() => normalizeReminderTimezone("UTC+03"), /REMINDER_TIMEZONE_INVALID/);
  assert.throws(() => normalizeReminderTimezone(""), /REMINDER_TIMEZONE_INVALID/);
});

test("smart reminders only accept supported recurrence types", () => {
  assert.equal(normalizeReminderRecurrence("once"), "once");
  assert.equal(normalizeReminderRecurrence("daily"), "daily");
  assert.equal(normalizeReminderRecurrence("weekly"), "weekly");
  assert.equal(normalizeReminderRecurrence("monthly"), "monthly");
  assert.throws(() => normalizeReminderRecurrence("hourly"), /REMINDER_RECURRENCE_INVALID/);
});

test("smart reminder schedule must be future and bounded", () => {
  const now = new Date("2026-09-05T09:00:00.000Z");
  assert.equal(validateReminderSchedule({ scheduledAt: new Date("2026-09-05T10:00:00.000Z"), now }).toISOString(), "2026-09-05T10:00:00.000Z");
  assert.throws(() => validateReminderSchedule({ scheduledAt: new Date("2026-09-05T08:59:59.999Z"), now }), /REMINDER_SCHEDULE_MUST_BE_FUTURE/);
  assert.throws(() => validateReminderSchedule({ scheduledAt: new Date("2032-01-01T00:00:00.000Z"), now }), /REMINDER_SCHEDULE_TOO_FAR/);
});

test("delivery idempotency is tenant and occurrence specific", () => {
  const occurrenceAt = new Date("2026-09-05T10:00:00.000Z");
  const a = reminderDeliveryIdempotencyKey({ businessId: "business-a", reminderId: "reminder-1", occurrenceAt });
  const aRepeat = reminderDeliveryIdempotencyKey({ businessId: "business-a", reminderId: "reminder-1", occurrenceAt });
  const otherTenant = reminderDeliveryIdempotencyKey({ businessId: "business-b", reminderId: "reminder-1", occurrenceAt });
  const otherOccurrence = reminderDeliveryIdempotencyKey({ businessId: "business-a", reminderId: "reminder-1", occurrenceAt: new Date("2026-09-05T11:00:00.000Z") });
  assert.equal(a, aRepeat);
  assert.notEqual(a, otherTenant);
  assert.notEqual(a, otherOccurrence);
  assert.match(a, /^[a-f0-9]{64}$/);
});
