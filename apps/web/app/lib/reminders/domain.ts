import { createHash } from "node:crypto";

export const REMINDER_STATUSES = ["scheduled", "paused", "completed", "cancelled"] as const;
export const REMINDER_DELIVERY_STATUSES = ["queued", "processing", "retry_scheduled", "sent", "failed", "delivery_unknown", "cancelled"] as const;
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

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

function localPartsAt(date: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
}

function sameLocalParts(a: LocalParts, b: LocalParts) {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;
}

export function reminderLocalDateTimeToUtc(localDateTime: string, timezoneInput: string) {
  const timezone = normalizeReminderTimezone(timezoneInput);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime.trim());
  if (!match) throw new Error("REMINDER_LOCAL_TIME_INVALID");
  const desired: LocalParts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
  if (desired.month < 1 || desired.month > 12 || desired.day < 1 || desired.day > 31 || desired.hour > 23 || desired.minute > 59) throw new Error("REMINDER_LOCAL_TIME_INVALID");
  const wallClockUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  const calendarCheck = new Date(wallClockUtc);
  if (calendarCheck.getUTCFullYear() !== desired.year || calendarCheck.getUTCMonth() + 1 !== desired.month || calendarCheck.getUTCDate() !== desired.day) throw new Error("REMINDER_LOCAL_TIME_INVALID");

  let candidate = new Date(wallClockUtc);
  for (let index = 0; index < 4; index += 1) {
    const actual = localPartsAt(candidate, timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const delta = actualAsUtc - wallClockUtc;
    if (delta === 0) break;
    candidate = new Date(candidate.getTime() - delta);
  }
  const matches: Date[] = [];
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 15) {
    const possible = new Date(candidate.getTime() + offsetMinutes * 60_000);
    if (sameLocalParts(localPartsAt(possible, timezone), desired)) matches.push(possible);
  }
  if (!matches.length) throw new Error("REMINDER_LOCAL_TIME_INVALID");
  matches.sort((a, b) => a.getTime() - b.getTime());
  return matches[0];
}

export function reminderTemplateSupportsBodyParameter(components: unknown) {
  if (!Array.isArray(components)) return false;
  const serialized = JSON.stringify(components);
  const allVariables = serialized.match(/\{\{[^{}]+\}\}/g) ?? [];
  if (allVariables.length !== 1 || allVariables[0] !== "{{1}}") return false;
  return components.some((component) => {
    if (!component || typeof component !== "object") return false;
    const record = component as Record<string, unknown>;
    return String(record.type ?? "").toUpperCase() === "BODY"
      && typeof record.text === "string"
      && record.text.includes("{{1}}");
  });
}
