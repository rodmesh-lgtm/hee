import type { PlanEntitlements } from "./plan-entitlements";
import type { StaffSection } from "./staff-permissions";

export const PAID_SECTIONS = {
  store: "متجر الأعمال", staff: "الموظفون والصلاحيات", notes: "مذكرات الأعمال",
  accounting: "البرنامج المحاسبي", reminders: "التذكيرات الذكية",
  appointments: "المواعيد والحجوزات", orders: "الطلبات", liveView: "المشاهدة المؤقتة",
} as const;
export type PaidSection = keyof typeof PAID_SECTIONS;
export function paidSectionForPath(path: string): PaidSection | null {
  const pathname = path.split(/[?#]/)[0];
  if (/^\/(Accounting|Laundromat)(\/|$)/.test(pathname)) return "accounting";
  const root = pathname.split("/")[2];
  if (!pathname.startsWith("/dashboard/")) return null;
  const routes: Record<string, PaidSection> = { "business-store":"store", staff:"staff", notes:"notes", reminders:"reminders", appointments:"appointments", "working-hours":"appointments", inbox:"orders", "live-view":"liveView" };
  return routes[root] ?? null;
}
export function paidSectionForPermission(section: StaffSection): PaidSection | null {
  if (section.startsWith("laundry")) return "accounting";
  return Object.hasOwn(PAID_SECTIONS, section) ? section as PaidSection : null;
}
export function canUsePaidSection(plan: PlanEntitlements, section: PaidSection): boolean {
  if (plan.code === "FREE") return false;
  if (section === "accounting") return plan.cashier;
  if (section === "appointments") return plan.bookings;
  if (section === "liveView") return plan.liveView;
  return true;
}
export function paidSectionBillingHref(section: PaidSection) {
  return `/dashboard/billing/manage?feature=${section}`;
}
