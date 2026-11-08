import { LaundryInputError, type LaundryLine } from "./laundry-domain";

export type ReturnLine = { index: number; quantity: number; name: string; unitPrice: number; amount: number; discount?: number };
export type ReturnBalance = { total: number; paid: number; returned?: number; refunded?: number };
export function invoiceBalance(t: ReturnBalance) {
  const net = t.total - (t.returned ?? 0), retained = t.paid - (t.refunded ?? 0);
  return { net, retained, outstanding: Math.max(0, net - retained), refundDue: Math.max(0, retained - net) };
}
export function quoteInvoiceReturn(items: LaundryLine[], previous: ReturnLine[], requested: Array<{index:number;quantity:number}>) {
  if (!requested.length || requested.length > items.length || new Set(requested.map(l=>l.index)).size !== requested.length) throw new LaundryInputError("حدد أصناف المرتجع دون تكرار");
  const lines = requested.map(l => {
    const original = items[l.index];
    const used = previous.filter(p=>p.index===l.index).reduce((s,p)=>s+p.quantity,0);
    if (!Number.isInteger(l.index) || l.index<0 || !original || !Number.isInteger(l.quantity) || l.quantity<1 || l.quantity>original.quantity-used) throw new LaundryInputError("كمية المرتجع تتجاوز المتبقي من الصنف");
    if (!Number.isSafeInteger(original.discount??0)||(original.discount??0)<0||original.total<0||original.total+(original.discount??0)!==original.unitPrice*original.quantity) throw new LaundryInputError("تفاصيل الفاتورة تحتاج مراجعة قبل الإرجاع");
    const amount=Math.round(original.total*(used+l.quantity)/original.quantity)-Math.round(original.total*used/original.quantity);
    const discount=original.unitPrice*l.quantity-amount;
    return {...l,name:original.name,unitPrice:original.unitPrice,amount,...(discount?{discount}:{})};
  });
  const amount=lines.reduce((s,l)=>s+l.amount,0);
  if (!Number.isSafeInteger(amount)||amount<=0) throw new LaundryInputError("قيمة المرتجع يجب أن تكون أكبر من صفر");
  return { lines, amount };
}
export function commissionReturnDelta(commission:number,total:number,previous:number,next:number) {
  if (![commission,total,previous,next].every(Number.isSafeInteger)||total<=0||previous<0||next<previous||next>total||commission<0||commission>total) throw new LaundryInputError("أساس تسوية العمولة غير صالح");
  return Math.round(commission*next/total)-Math.round(commission*previous/total);
}
