import { LaundryInputError, moneyToHalalas } from "./laundry-domain";

export type CommissionKind = "fixed" | "percent";
// Integers throughout: value is halalas for fixed amounts, basis points for percentages.
export function commissionQuote(kind: CommissionKind, raw: string, base: number) {
  if (!Number.isSafeInteger(base) || base < 0 || base > 100000000)
    throw new LaundryInputError("إجمالي الفاتورة غير صالح لحساب العمولة");
  const value = moneyToHalalas(raw.trim());
  if (value <= 0 || (kind === "percent" && value > 10000))
    throw new LaundryInputError("أدخل عمولة موجبة، والنسبة لا تتجاوز 100٪");
  if (kind !== "fixed" && kind !== "percent") throw new LaundryInputError("اختر نوع العمولة");
  const amount = kind === "fixed" ? value : Math.round(base * value / 10000);
  if (amount <= 0 || amount > base)
    throw new LaundryInputError("العمولة يجب ألا تقل عن هللة أو تتجاوز إجمالي الفاتورة");
  return { kind, value, base, amount };
}

export type CommissionSummary = { phone: string; name: string; invoices: number; amount: number };
export type CommissionEntry = { id: string; number: number; name: string; phone: string; kind: CommissionKind; value: number; base: number; amount: number; createdAt: string };
export type CommissionReport = { employees: CommissionSummary[]; entries: CommissionEntry[]; count: number; amount: number; page: number };
