import assert from "node:assert/strict";
import test from "node:test";
import { nextReminderOccurrence, normalizeReminderRecurrence, normalizeReminderTimezone, reminderDeliveryIdempotencyKey, reminderLocalDateTimeToUtc, reminderTemplateSupportsBodyParameter, validateReminderSchedule } from "../app/lib/reminders/domain";

test("smart reminders accept real IANA timezones and reject invalid zones", () => {
  assert.equal(normalizeReminderTimezone("Asia/Riyadh"), "Asia/Riyadh");
  assert.equal(normalizeReminderTimezone("America/New_York"), "America/New_York");
  assert.throws(() => normalizeReminderTimezone("UTC+03"), /REMINDER_TIMEZONE_INVALID/);
  assert.throws(() => normalizeReminderTimezone(""), /REMINDER_TIMEZONE_INVALID/);
});

test("local reminder time converts to UTC without depending on server timezone", () => {
  assert.equal(reminderLocalDateTimeToUtc("2026-09-05T18:00", "Asia/Riyadh").toISOString(), "2026-09-05T15:00:00.000Z");
  assert.equal(reminderLocalDateTimeToUtc("2026-07-01T09:30", "America/New_York").toISOString(), "2026-07-01T13:30:00.000Z");
});

test("DST gaps fail closed and repeated wall time resolves deterministically to the earliest occurrence", () => {
  assert.throws(() => reminderLocalDateTimeToUtc("2026-03-08T02:30", "America/New_York"), /REMINDER_LOCAL_TIME_INVALID/);
  assert.equal(reminderLocalDateTimeToUtc("2026-11-01T01:30", "America/New_York").toISOString(), "2026-11-01T05:30:00.000Z");
});

test("smart reminders only accept supported recurrence types", () => {
  assert.equal(normalizeReminderRecurrence("once"), "once");
  assert.equal(normalizeReminderRecurrence("daily"), "daily");
  assert.equal(normalizeReminderRecurrence("weekly"), "weekly");
  assert.equal(normalizeReminderRecurrence("monthly"), "monthly");
  assert.throws(() => normalizeReminderRecurrence("hourly"), /REMINDER_RECURRENCE_INVALID/);
});

test("daily recurrence preserves local wall time across DST instead of adding 24 hours", () => {
  const beforeDst = reminderLocalDateTimeToUtc("2026-03-07T09:30", "America/New_York");
  assert.equal(nextReminderOccurrence({ occurrenceAt: beforeDst, timezone: "America/New_York", recurrenceType: "daily" })?.toISOString(), "2026-03-08T13:30:00.000Z");
});

test("recurrence skips nonexistent DST wall time and resumes at the next valid local occurrence", () => {
  const beforeGap = reminderLocalDateTimeToUtc("2026-03-07T02:30", "America/New_York");
  assert.equal(nextReminderOccurrence({ occurrenceAt: beforeGap, timezone: "America/New_York", recurrenceType: "daily" })?.toISOString(), "2026-03-09T06:30:00.000Z");
});

test("weekly recurrence preserves weekday and monthly recurrence skips months without the requested day", () => {
  const weekly = reminderLocalDateTimeToUtc("2026-09-05T18:00", "Asia/Riyadh");
  assert.equal(nextReminderOccurrence({ occurrenceAt: weekly, timezone: "Asia/Riyadh", recurrenceType: "weekly" })?.toISOString(), "2026-09-12T15:00:00.000Z");
  const january31 = reminderLocalDateTimeToUtc("2027-01-31T10:00", "Asia/Riyadh");
  assert.equal(nextReminderOccurrence({ occurrenceAt: january31, timezone: "Asia/Riyadh", recurrenceType: "monthly" })?.toISOString(), "2027-03-31T07:00:00.000Z");
});

test("one-time reminders have no next recurrence", () => {
  assert.equal(nextReminderOccurrence({ occurrenceAt: new Date("2026-09-05T10:00:00.000Z"), timezone: "Asia/Riyadh", recurrenceType: "once" }), null);
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

test("reminder template permits one body parameter and rejects unresolved extra variables", () => {
  assert.equal(reminderTemplateSupportsBodyParameter([{ type: "BODY", text: "تذكير INFRO: {{1}}" }]), true);
  assert.equal(reminderTemplateSupportsBodyParameter([{ type: "BODY", text: "تذكير INFRO" }]), false);
  assert.equal(reminderTemplateSupportsBodyParameter([{ type: "BODY", text: "{{1}} - {{2}}" }]), false);
  assert.equal(reminderTemplateSupportsBodyParameter([{ type: "HEADER", text: "{{1}}" }, { type: "BODY", text: "تذكير" }]), false);
  assert.equal(reminderTemplateSupportsBodyParameter(null), false);
});
