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

/** Resolve explicit laundry metadata or a previously configured laundry catalogue. */
export function accountingActivity(business: { businessType: string; businessCategory?: string | null }, hasLaundryCatalogue = false): AccountingActivity {
  const activity = `${business.businessCategory ?? ""} ${business.businessType}`.normalize("NFKC").toLowerCase();
  return /مغسل|مغاسل|laundry|laundromat/.test(activity) || hasLaundryCatalogue ? "laundry" : "general";
}
