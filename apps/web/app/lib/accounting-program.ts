import { cashierActivityProfile } from "./cashier-activity";
import { memberCanAccess } from "./staff-permissions";

export type AccountingActivity = "laundry" | "general";
export type AccountingView = "cashier" | "accounting" | "operations" | "delivery";
export const accountingViews = [
  { id: "cashier", permission: "laundry", label: "نقطة البيع" },
  { id: "accounting", permission: "laundryAccounting", label: "الإدارة المالية" },
  { id: "operations", permission: "laundryOperations", label: "العملاء والمخزون" },
  { id: "delivery", permission: "laundryDelivery", label: "التوصيل" },
] as const;

export function allowedAccountingViews(owner: boolean, permissions: unknown) {
  return accountingViews.filter(view => owner || memberCanAccess(permissions, view.permission));
}

/** Resolve from tenant metadata. The legacy catalogue argument cannot change activity. */
export function accountingActivity(business: { businessType: string; businessCategory?: string | null }, hasLaundryCatalogue = false): AccountingActivity {
  void hasLaundryCatalogue;
  return cashierActivityProfile(business).id === "laundry" ? "laundry" : "general";
}
