import { LaundryInputError, moneyToHalalas, type LaundryLine } from './laundry-domain';
export type CashierDiscount={kind:'none'|'percent'|'fixed';value:string};
export function discountedCashierLines(lines:LaundryLine[],discount?:CashierDiscount):LaundryLine[]{
 if(!discount||discount.kind==='none')return lines.map(l=>({...l}));
 const kind=discount.kind;
 const value=moneyToHalalas(discount.value),gross=lines.reduce((s,l)=>s+l.total,0);
 if(discount.kind==='percent'&&value>=10000)throw new LaundryInputError('نسبة الخصم يجب أن تكون أقل من 100٪');
 const amount=discount.kind==='percent'?Math.round(gross*value/10000):value;
 if(!amount)return lines.map(l=>({...l}));
 if(amount>=gross)throw new LaundryInputError('الخصم يجب أن يقل عن قيمة الخدمات غير المغطاة بالباقة');
 let through=0,allocated=0;
 return lines.map(line=>{
  through+=line.total;const next=Math.round(amount*through/gross),part=next-allocated;allocated=next;
  if(part&&line.total-part<line.quantity)throw new LaundryInputError("الخصم كبير جدًا؛ يجب ألا يقل صافي سعر الوحدة عن هللة");
  return {...line,total:line.total-part,...(part?{discount:part,discountKind:kind,discountValue:value}:{})};
 });
}
export function cashierDiscountSummary(lines:LaundryLine[]){
 const amount=lines.reduce((s,l)=>s+(l.discount??0),0);
 return {amount,subtotal:lines.reduce((s,l)=>s+l.total,0)+amount};
}
