import { createHash } from "node:crypto";

export const REMINDER_STATUSES = ["scheduled", "paused", "completed", "cancelled"] as const;
export const REMINDER_DELIVERY_STATUSES = ["pending", "queued", "processing", "sent", "failed", "delivery_unknown", "cancelled"] as const;
export const REMINDER_RECURRENCE_TYPES = ["once", "daily", "weekly", "monthly"] as const;

export type ReminderStatus = typeof REMINDER_STATUSES[number];
export type ReminderRecurrenceType = typeof REMINDER_RECURRENCE_TYPES[number];

export function normalizeReminderTimezone(value: string) {
  const timezone = value.trim();
  if (!timezone || timezone.length > 64) throw new Error("REMINDER_TIMEZONE_INVALID");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("REMINDER_TIMEZONE_INVALID");
  }
  return timezone;
}

export function normalizeReminderRecurrence(value: string): ReminderRecurrenceType {
  if (!(REMINDER_RECURRENCE_TYPES as readonly string[]).includes(value)) throw new Error("REMINDER_RECURRENCE_INVALID");
  return value as ReminderRecurrenceType;
}

export function reminderDeliveryIdempotencyKey(input: { businessId: string; reminderId: string; occurrenceAt: Date }) {
  return createHash("sha256")
    .update(["infro-reminder-v1", input.businessId, input.reminderId, input.occurrenceAt.toISOString()].join(":"))
    .digest("hex");
}

export function validateReminderSchedule(input: { scheduledAt: Date; now?: Date }) {
  const now = input.now ?? new Date();
  if (Number.isNaN(input.scheduledAt.getTime())) throw new Error("REMINDER_SCHEDULE_INVALID");
  if (input.scheduledAt.getTime() <= now.getTime()) throw new Error("REMINDER_SCHEDULE_MUST_BE_FUTURE");
  if (input.scheduledAt.getTime() > now.getTime() + 5 * 366 * 24 * 60 * 60_000) throw new Error("REMINDER_SCHEDULE_TOO_FAR");
  return input.scheduledAt;
}
