import { LaundryInputError } from "./laundry-domain";

export type ReconciliationLine = { id: string; debit: number; credit: number };
export function laundryBankBalance(value: string) {
  const s = value.trim();
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(s)) throw new LaundryInputError("أدخل رصيد الكشف بمنزلتين عشريتين كحد أقصى");
  const negative = s.startsWith("-");
  const [whole, fraction = ""] = (negative ? s.slice(1) : s).split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -amount : amount;
}
export function laundryReconciliation(input: {
  bookBalance: number;
  statementBalance: number;
  lines: ReconciliationLine[];
  outstandingIds: string[];
}) {
  const ids = new Set(input.outstandingIds);
  const lineIds = new Set(input.lines.map(l => l.id));
  if (ids.size !== input.outstandingIds.length || input.lines.length !== lineIds.size)
    throw new LaundryInputError("توجد حركة مكررة في المطابقة");
  if (input.outstandingIds.some(id => !lineIds.has(id)))
    throw new LaundryInputError("تغيرت حركات الحساب؛ حدّث الكشف وأعد المطابقة");
  if (![input.bookBalance, input.statementBalance, ...input.lines.flatMap(l => [l.debit, l.credit])].every(Number.isSafeInteger))
    throw new LaundryInputError("أرصدة المطابقة غير صالحة");
  const outstanding = input.lines.filter(l => ids.has(l.id)).reduce((sum, l) => sum + l.debit - l.credit, 0);
  const adjustedStatement = input.statementBalance + outstanding;
  const difference = input.bookBalance - adjustedStatement;
  if (![outstanding, adjustedStatement, difference].every(Number.isSafeInteger))
    throw new LaundryInputError("أرصدة المطابقة تتجاوز الحد المسموح");
  return { outstanding, adjustedStatement, difference, matchedIds: input.lines.filter(l => !ids.has(l.id)).map(l => l.id) };
}
