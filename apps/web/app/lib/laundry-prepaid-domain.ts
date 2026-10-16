import { LaundryInputError } from "./laundry-domain";
import type { LedgerLine } from "./laundry-ledger-domain";
export function prepaidRemaining(balance:number,amount:number,expiresAt:Date,now:Date,kind:"redeem"|"refund",outstanding?:number){
 if(!Number.isSafeInteger(balance)||!Number.isSafeInteger(amount)||amount<=0||amount>balance)throw new LaundryInputError("المبلغ يجب ألا يتجاوز الرصيد المتبقي للاشتراك");
 if(kind==="redeem"){
  if(expiresAt<=now)throw new LaundryInputError("انتهت مدة استخدام الاشتراك؛ يبقى الرصيد متاحًا للاسترداد");
  if(!Number.isSafeInteger(outstanding)||amount>outstanding!)throw new LaundryInputError("مبلغ الاستخدام يتجاوز المتبقي على الطلب");
 }
 return balance-amount;
}
export function prepaidCashLines(kind:"purchase"|"refund",amount:number,method:string):LedgerLine[]{
 const account=method==="cash"?"1100":method==="transfer"?"1120":kind==="purchase"&&method==="card"?"1110":null;
 if(!account||!Number.isSafeInteger(amount)||amount<=0)throw new LaundryInputError("راجع مبلغ الاشتراك وطريقة الدفع");
 const [dr,cr]=kind==="purchase"?[account,"2100"]:["2100",account];
 return [{accountCode:dr,debit:amount,credit:0},{accountCode:cr,debit:0,credit:amount}];
}
