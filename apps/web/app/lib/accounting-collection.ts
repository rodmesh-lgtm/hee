import { LaundryInputError, moneyToHalalas } from "./laundry-domain";
export const collectionLabels: Record<string, string> = { cash: "نقدًا", card: "شبكة — تسجيل يدوي", transfer: "تحويل", prepaid: "رصيد اشتراك" };
export function collectionAllocations(amountText: string, method: "cash" | "card" | "transfer" | "mixed", cashText = "0") {
  const total = moneyToHalalas(amountText);
  if (method !== "mixed") return total ? [{ method, amount: total }] : [];
  const cash = moneyToHalalas(cashText);
  if (cash <= 0 || cash >= total) throw new LaundryInputError("للدفع المختلط، أدخل جزءًا نقديًا أكبر من صفر وأقل من إجمالي الدفعة");
  return [{ method: "cash" as const, amount: cash }, { method: "card" as const, amount: total - cash }];
}
