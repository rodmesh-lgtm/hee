import { LaundryInputError } from "./laundry-domain";
export const LAUNDRY_ACCOUNTS=[
 {code:"1100",name:"الصندوق — العمليات المسجلة",kind:"asset"},
 {code:"1110",name:"تحصيل الشبكة قيد التسوية",kind:"asset"},
 {code:"1120",name:"التحويلات المسجلة",kind:"asset"},
 {code:"1200",name:"ذمم العملاء",kind:"asset"},
 {code:"1300",name:"مخزون المواد",kind:"asset"},
 {code:"2000",name:"ذمم الموردين",kind:"liability"},
 {code:"2100",name:"أرصدة اشتراكات العملاء",kind:"liability"},
 {code:"2200",name:"طلبات مستلمة غير مسلّمة",kind:"liability"},
 {code:"2900",name:"مصروفات لم يُحدد مصدر دفعها",kind:"liability"},
 {code:"3000",name:"الأرصدة الافتتاحية وحقوق الملكية",kind:"equity"},
 {code:"4000",name:"إيراد الخدمات المسلّمة",kind:"income"},
 {code:"5000",name:"مصروفات تشغيل المغسلة",kind:"expense"},
 {code:"5100",name:"استهلاك مواد المغسلة",kind:"expense"},
] as const;
export type LedgerLine={accountCode:string;debit:number;credit:number};
export function balancedLaundryLines(lines:LedgerLine[]){
 if(lines.length<2||lines.length>100)throw new LaundryInputError("القيد يحتاج من سطرين إلى 100 سطر");
 let debit=0,credit=0;
 for(const l of lines){
 if(!/^\d{4,8}$/.test(l.accountCode)||![l.debit,l.credit].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1e12)||(l.debit>0)===(l.credit>0))throw new LaundryInputError("كل سطر يحتاج مبلغًا موجبًا في المدين أو الدائن فقط");
 debit+=l.debit;credit+=l.credit;
 }
 if(!Number.isSafeInteger(debit)||debit!==credit)throw new LaundryInputError("إجمالي المدين يجب أن يساوي إجمالي الدائن");
 return {debit,credit};
}
export function laundrySourceLines(kind:"order"|"payment"|"delivery"|"expense",amount:number,method="unspecified"):LedgerLine[]{
 if(!Number.isSafeInteger(amount)||amount<=0)throw new LaundryInputError("مبلغ القيد غير صالح");
 const account=method==="cash"?"1100":method==="card"?"1110":method==="transfer"?"1120":null;
 if(kind==="payment"&&!account)throw new LaundryInputError("طريقة التحصيل غير مدعومة في الدفتر");
 const [dr,cr]=kind==="order"?["1200","2200"]:kind==="payment"?[account!,"1200"]:kind==="delivery"?["2200","4000"]:["5000",account??"2900"];
 return [{accountCode:dr,debit:amount,credit:0},{accountCode:cr,debit:0,credit:amount}];
}
