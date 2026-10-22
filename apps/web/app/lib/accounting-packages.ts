import { LaundryInputError, type LaundryLine } from "./laundry-domain";
export type AccountingPackage = {id:string;name:string;description:string;amount:number;durationDays:number;serviceIds:string[];active:boolean};
export type SubscriberBalance = {id:string;name:string;remaining:number;startsAt:string;expiresAt:string;serviceIds:string[]};
export function subscriberStatus(s:SubscriberBalance,now=new Date()) {
 if(s.remaining===0)return "exhausted";
 if(new Date(s.startsAt)>now)return "scheduled";
 return new Date(s.expiresAt)<=now?"expired":"active";
}
export const subscriberStatusLabels={active:"نشط",scheduled:"لم يبدأ",expired:"منتهي الصلاحية",exhausted:"نفد الرصيد"};
export function packagePeriod(start:string,days:number,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(days)||days<1||days>366)throw new LaundryInputError("راجع تاريخ بداية الباقة ومدتها");
 const startsAt=new Date(`${start}T00:00:00+03:00`);
 if(!Number.isFinite(startsAt.getTime())||new Date(startsAt.getTime()+10800000).toISOString().slice(0,10)!==start)throw new LaundryInputError("تاريخ البداية غير صالح");
 const today=new Date(now.getTime()+10800000).toISOString().slice(0,10);
 if(start<today||startsAt.getTime()>now.getTime()+366*86400000)throw new LaundryInputError("اختر بداية من اليوم وخلال السنة القادمة");
 return {startsAt,expiresAt:new Date(startsAt.getTime()+days*86400000)};
}
// Only used for a new order: no earlier payments/allocations exist on its lines.
export function allocateSubscriptions(subscriptions:SubscriberBalance[],lines:Pick<LaundryLine,"serviceId"|"total">[],outstanding:number,now=new Date()) {
 if(!Number.isSafeInteger(outstanding)||outstanding<0||lines.some(l=>!Number.isSafeInteger(l.total)||l.total<0))throw new LaundryInputError("مبلغ الطلب غير صالح");
 const budgets=lines.map(l=>({...l}));let due=outstanding;
 const allocations:Array<{id:string;name:string;amount:number;remaining:number}>=[];
 for(const s of [...subscriptions].sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt)||a.id.localeCompare(b.id))){
  if(subscriberStatus(s,now)!=="active"||!Number.isSafeInteger(s.remaining)||s.remaining<1)continue;
  let capacity=Math.min(s.remaining,due),amount=0;
  for(const line of budgets){if(s.serviceIds.length&&!s.serviceIds.includes(line.serviceId))continue;const take=Math.min(capacity,line.total);line.total-=take;capacity-=take;amount+=take;}
  if(amount){allocations.push({id:s.id,name:s.name,amount,remaining:s.remaining-amount});due-=amount;}
  if(!due)break;
 }
 return {allocations,covered:outstanding-due,outstanding:due};
}
export function assertSubscriptionServices(serviceIds:string[],lines:Pick<LaundryLine,"serviceId">[]) {
 if(serviceIds.length&&(!lines.length||lines.some(l=>!serviceIds.includes(l.serviceId))))throw new LaundryInputError("الطلب يحتوي خدمات خارج الباقة؛ استخدم الخصم التلقائي عند إنشاء طلب بالخدمات المشمولة");
}
