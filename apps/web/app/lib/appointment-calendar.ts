export type CalendarView = "day" | "week";
export const CALENDAR_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
export function calendarStatus(value: unknown) {
  return typeof value === "string" && CALENDAR_STATUSES.includes(value as typeof CALENDAR_STATUSES[number]) ? value : "";
}
export function riyadhCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
export function calendarDate(value: unknown, fallback = riyadhCalendarDate()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2099-12-31") return fallback;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : fallback;
}
export function shiftCalendarDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function calendarWindow(date: string, view: CalendarView) {
  // Weeks start on Sunday. Date arithmetic is independent of the host timezone.
  const start = view === "week" ? shiftCalendarDate(date, -new Date(`${date}T12:00:00Z`).getUTCDay()) : date;
  const length = view === "week" ? 7 : 1;
  return { start, end: shiftCalendarDate(start, length), days: Array.from({ length }, (_, i) => shiftCalendarDate(start, i)), previous: shiftCalendarDate(date, -length), next: shiftCalendarDate(date, length) };
}
