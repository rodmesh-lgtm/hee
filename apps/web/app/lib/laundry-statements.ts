import { LaundryInputError } from "./laundry-domain";
type Account={code:string;name:string;kind:string;opening:number;debit:number;credit:number;balance:number};
export function laundryStatements(accounts:Account[]){
 const totals={assets:0,liabilities:0,equity:0,accumulatedResult:0,income:0,expenses:0};
 for(const a of accounts){
  if(![a.opening,a.debit,a.credit,a.balance].every(Number.isSafeInteger))throw new LaundryInputError("أرصدة القوائم غير صالحة");
  if(a.kind==="asset")totals.assets+=a.balance;
  else if(a.kind==="liability")totals.liabilities-=a.balance;
  else if(a.kind==="equity")totals.equity-=a.balance;
  else if(a.kind==="income"){totals.income+=a.credit-a.debit;totals.accumulatedResult-=a.balance;}
  else if(a.kind==="expense"){totals.expenses+=a.debit-a.credit;totals.accumulatedResult-=a.balance;}
  else throw new LaundryInputError("نوع حساب غير معروف");
 }
 return {...totals,periodResult:totals.income-totals.expenses,difference:totals.assets-totals.liabilities-totals.equity-totals.accumulatedResult};
}
