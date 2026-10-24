import { LaundryInputError } from "./laundry-domain";
export const subscriptionMonths = Array.from({length:12},(_,i)=>i+1);
export function monthLabel(n:number) { return n===1?"شهر":n===2?"شهران":n===12?"سنة كاملة":`${n} أشهر`; }
export function riyadhDate(now=new Date()) { return new Date(now.getTime()+10800000).toISOString().slice(0,10); }
export function calendarSubscriptionPeriod(start:string,months:number,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(months)||months<1||months>12)throw new LaundryInputError("اختر تاريخ البداية ومدة من شهر إلى سنة");
 const base=new Date(`${start}T00:00:00Z`);
 if(!Number.isFinite(base.getTime())||base.toISOString().slice(0,10)!==start)throw new LaundryInputError("تاريخ البداية غير صالح");
 if(start<riyadhDate(now)||base.getTime()-10800000>now.getTime()+366*86400000)throw new LaundryInputError("اختر بداية من اليوم وخلال السنة القادمة");
 const year=base.getUTCFullYear(),month=base.getUTCMonth()+months;
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const end=new Date(Date.UTC(year,month,Math.min(base.getUTCDate(),last)));
 return {startsAt:new Date(base.getTime()-10800000),expiresAt:new Date(end.getTime()-10800000)};
}
export function deliveryShortcut(hours:number,now=new Date()) {
 // Round up so a preset never produces an already elapsed minute.
 return new Date(Math.ceil((now.getTime()+hours*3600000)/900000)*900000+10800000).toISOString().slice(0,16);
}
