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

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function localPartsString(parts: LocalParts) {
  return `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function validCalendarDate(parts: Pick<LocalParts, "year" | "month" | "day">) {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return value.getUTCFullYear() === parts.year && value.getUTCMonth() + 1 === parts.month && value.getUTCDate() === parts.day;
}

export function reminderLocalDateTimeToUtc(localDateTime: string, timezoneInput: string) {
  const timezone = normalizeReminderTimezone(timezoneInput);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime.trim());
  if (!match) throw new Error("REMINDER_LOCAL_TIME_INVALID");
  const desired: LocalParts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
  if (desired.month < 1 || desired.month > 12 || desired.day < 1 || desired.day > 31 || desired.hour > 23 || desired.minute > 59 || !validCalendarDate(desired)) throw new Error("REMINDER_LOCAL_TIME_INVALID");
  const wallClockUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);

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

function addLocalPeriod(parts: LocalParts, recurrenceType: Exclude<ReminderRecurrenceType, "once">, step: number): LocalParts | null {
  if (recurrenceType === "monthly") {
    const monthIndex = parts.month - 1 + step;
    const year = parts.year + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12 + 1;
    const candidate = { ...parts, year, month };
    return validCalendarDate(candidate) ? candidate : null;
  }
  const dayStep = recurrenceType === "weekly" ? 7 * step : step;
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayStep, parts.hour, parts.minute));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate(), hour: parts.hour, minute: parts.minute };
}

export function nextReminderOccurrence(input: { occurrenceAt: Date; timezone: string; recurrenceType: ReminderRecurrenceType | string }) {
  const recurrenceType = normalizeReminderRecurrence(input.recurrenceType);
  if (recurrenceType === "once") return null;
  if (Number.isNaN(input.occurrenceAt.getTime())) throw new Error("REMINDER_OCCURRENCE_INVALID");
  const timezone = normalizeReminderTimezone(input.timezone);
  const local = localPartsAt(input.occurrenceAt, timezone);
  const maximumAttempts = recurrenceType === "monthly" ? 36 : 8;
  for (let step = 1; step <= maximumAttempts; step += 1) {
    const candidateLocal = addLocalPeriod(local, recurrenceType, step);
    if (!candidateLocal) continue;
    try {
      const next = reminderLocalDateTimeToUtc(localPartsString(candidateLocal), timezone);
      if (next.getTime() > input.occurrenceAt.getTime()) return next;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "REMINDER_LOCAL_TIME_INVALID") throw error;
    }
  }
  throw new Error("REMINDER_NEXT_OCCURRENCE_UNRESOLVABLE");
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
