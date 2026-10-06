export const APPOINTMENT_TABS = ["upcoming", "new", "history", "branches"] as const;
export type AppointmentTab = (typeof APPOINTMENT_TABS)[number];
export function appointmentTab(value: unknown): AppointmentTab {
  return typeof value === "string" && APPOINTMENT_TABS.includes(value as AppointmentTab) ? value as AppointmentTab : "upcoming";
}
export function appointmentPage(value: unknown) {
  const parsed = Number(value ?? 1);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, 10000) : 1;
}
export function appointmentSearch(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}
export function appointmentSearchPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}
export function appointmentStatus(status: string) {
  const labels: Record<string, string> = { pending: "بانتظار التأكيد", confirmed: "مؤكد", completed: "حضر", cancelled: "ملغي", no_show: "لم يحضر" };
  return labels[status] ?? "قيد المراجعة";
}
