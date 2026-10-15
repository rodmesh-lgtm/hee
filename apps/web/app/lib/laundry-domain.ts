export const LAUNDRY_STATUSES = { received: "مستلم", processing: "قيد المعالجة", ready: "جاهز للاستلام", delivered: "تم التسليم" } as const;
export class LaundryInputError extends Error {}
export const LAUNDRY_FILTERS = { all: "جميع الطلبات", overdue: "متأخرة عن التسليم", ready: "جاهزة للاستلام", unpaid: "غير مسددة", delivered: "تم تسليمها" } as const;
export type LaundryFilter = keyof typeof LAUNDRY_FILTERS;
export function laundryFilter(value: unknown): LaundryFilter {
  return typeof value === "string" && Object.hasOwn(LAUNDRY_FILTERS, value) ? value as LaundryFilter : "all";
}
export type LaundryStatus = keyof typeof LAUNDRY_STATUSES;
export type LaundryService = { id: string; name: string; category: string; price: number; active: boolean };
export type LaundryLine = { serviceId: string; name: string; quantity: number; unitPrice: number; total: number };
export type LaundryTicket = { id: string; number: number; customerName: string; phone: string; items: LaundryLine[]; total: number; paid: number; status: LaundryStatus; dueAt: Date; notes: string; createdAt: Date };
export function moneyToHalalas(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) throw new LaundryInputError("أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (amount > 10000000) throw new LaundryInputError("المبلغ أكبر من الحد المسموح");
  return amount;
}
export function laundryLines(input: Array<{ serviceId: string; quantity: number }>, catalog: LaundryService[]) {
  if (!input.length || input.length > 80 || new Set(input.map(x => x.serviceId)).size !== input.length) throw new LaundryInputError("تحقق من خدمات الطلب");
  const lines = input.map(item => {
    const service = catalog.find(x => x.id === item.serviceId && x.active);
    if (!service || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new LaundryInputError("خدمة غير متاحة أو كمية غير صحيحة");
    return { serviceId: service.id, name: service.name, quantity: item.quantity, unitPrice: service.price, total: service.price * item.quantity };
  });
  if (lines.reduce((sum, x) => sum + x.total, 0) > 100000000) throw new LaundryInputError("إجمالي الطلب أكبر من الحد المسموح");
  return lines;
}
export function nextLaundryStatus(current: LaundryStatus, next: LaundryStatus, outstanding: number) {
  const sequence = Object.keys(LAUNDRY_STATUSES);
  return sequence.indexOf(next) === sequence.indexOf(current) + 1 && (next !== "delivered" || outstanding === 0);
}
export const laundryMoney = (amount: number) => (amount / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
