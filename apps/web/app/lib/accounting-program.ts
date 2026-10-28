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

/** Legacy evidence is accepted only for generic metadata, never over a specific declared activity. */
export function accountingActivity(business: { businessType: string; businessCategory?: string | null }, hasLaundryCatalogue = false): AccountingActivity {
  return cashierActivityProfile(business,hasLaundryCatalogue).id === "laundry" ? "laundry" : "general";
}
