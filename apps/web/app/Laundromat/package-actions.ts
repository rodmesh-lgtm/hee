"use server";
import { cashierProfileForBusiness } from "../lib/cashier-profile-server";
import { cashierServiceAllowed } from "../lib/cashier-activity";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser,getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { laundryCustomerPhone } from "../lib/laundry-customer";
import { LaundryInputError,moneyToHalalas } from "../lib/laundry-domain";
import type { AccountingPackage,SubscriberBalance } from "../lib/accounting-packages";
const key=z.string().uuid();
export async function saveAccountingPackage(value:unknown):Promise<{ok:boolean;error?:string}> {
 const p=z.object({businessId:key,requestId:key,name:z.string().trim().min(2).max(100),description:z.string().trim().max(500),amount:z.string(),kind:z.enum(["credit","pieces","visits"]).default("credit"),unitsIncluded:z.coerce.number().int().min(0).max(10000).default(0),durationDays:z.coerce.number().int().min(1).max(366),serviceIds:z.array(key).max(200)}).safeParse(value);
 if(!p.success)return {ok:false,error:"راجع اسم الباقة والسعر والمدة والخدمات"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId||b.ownerId!==user.id)return {ok:false,error:"تعريف الباقات متاح لمالك المنشأة النشطة فقط"};
 try{const d=p.data,amount=moneyToHalalas(d.amount);if(amount<=0)throw new LaundryInputError("أدخل سعرًا أكبر من صفر");
 if(d.kind!=="credit"&&(d.unitsIncluded<1||amount<d.unitsIncluded||d.serviceIds.length!==1))throw new LaundryInputError("حدد خدمة واحدة وعددًا صحيحًا؛ يجب ألا تقل قيمة الوحدة عن هللة");
 await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const old=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "AccountingPackage" WHERE "businessId"=${b.id} AND id=${d.requestId}`;if(old.length)return;
 const profile=await cashierProfileForBusiness(b,tx);
 const services=await tx.$queryRaw<Array<{id:string;name:string;category:string}>>`SELECT id,name,category FROM "LaundryService" WHERE "businessId"=${b.id} AND active=TRUE AND id NOT LIKE 'urgent:%'`;
 if(d.serviceIds.some(id=>!services.some(s=>s.id===id&&cashierServiceAllowed(b,s,profile.id==="laundry"))))throw new LaundryInputError("اختر خدمات فعالة من كتالوج المنشأة نفسها");
 await tx.$executeRaw`INSERT INTO "AccountingPackage" (id,"businessId",name,description,amount,"durationDays","serviceIds",kind,"unitsIncluded","createdBy") VALUES (${d.requestId},${b.id},${d.name},${d.description},${amount},${d.durationDays},${JSON.stringify([...new Set(d.serviceIds)])}::jsonb,${d.kind},${d.kind==="credit"?null:d.unitsIncluded},${user.id})`;
 await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'package-create',${d.requestId})`;
 });revalidatePath("/Accounting");revalidatePath("/Laundromat");return {ok:true};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ الباقة؛ أعد المحاولة بنفس البيانات"};}
}
export async function archiveAccountingPackage(value:unknown):Promise<{ok:boolean;error?:string}> {
 const p=z.object({businessId:key,id:key}).safeParse(value);if(!p.success)return {ok:false,error:"باقة غير صالحة"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId||b.ownerId!==user.id)return {ok:false,error:"إيقاف الباقات متاح للمالك فقط"};
 try{await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const changed=await tx.$executeRaw`UPDATE "AccountingPackage" SET active=FALSE WHERE "businessId"=${b.id} AND id=${p.data.id} AND active=TRUE`;
 if(changed)await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'package-archive',${p.data.id})`;
 });revalidatePath("/Accounting");revalidatePath("/Laundromat");return {ok:true};}catch{return {ok:false,error:"تعذر إيقاف الباقة"};}
}
export async function getAccountingPackages(value:unknown):Promise<{ok:true;packages:AccountingPackage[];services:Array<{id:string;name:string;category:string}>;canManage:boolean}|{ok:false;error:string}>{
 const p=z.object({businessId:key}).safeParse(value);if(!p.success)return {ok:false,error:"منشأة غير صالحة"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId)return {ok:false,error:"يلزم صلاحية المحاسبة"};
 try{const packages=await db.$queryRaw<AccountingPackage[]>`SELECT id,name,description,amount,"durationDays","serviceIds",active,kind,"unitsIncluded" FROM "AccountingPackage" WHERE "businessId"=${b.id} ORDER BY active DESC,"createdAt" DESC LIMIT 200`;
 const profile=await cashierProfileForBusiness(b);
 const services=await db.$queryRaw<Array<{id:string;name:string;category:string}>>`SELECT id,name,category FROM "LaundryService" WHERE "businessId"=${b.id} AND active=TRUE AND id NOT LIKE 'urgent:%' ORDER BY category,name`;
 return {ok:true,packages,services:services.filter(s=>cashierServiceAllowed(b,s,profile.id==="laundry")),canManage:b.ownerId===user.id};}catch{return {ok:false,error:"تعذر تحميل الباقات"};}
}
export async function getCashierSubscriptions(value:unknown):Promise<{ok:true;subscriptions:SubscriberBalance[]}|{ok:false;error:string}>{
 const p=z.object({businessId:key,phone:z.string().max(40)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع الجوال"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundry");if(!b||b.id!==p.data.businessId)return {ok:false,error:"يلزم صلاحية الكاشير في المنشأة النشطة"};
 try{const phone=laundryCustomerPhone(p.data.phone);
 const rows=await db.$queryRaw<Array<Omit<SubscriberBalance,"startsAt"|"expiresAt">&{startsAt:Date;expiresAt:Date}>>`SELECT s.id,s.name,s.remaining,s.kind,s."unitsIncluded",s."unitsRemaining",s."startsAt",s."expiresAt",s."serviceIds" FROM "LaundryPrepaid" s JOIN "LaundryCustomer" c ON c.id=s."customerId" AND c."businessId"=s."businessId" WHERE s."businessId"=${b.id} AND c.phone=${phone} AND s.remaining>0 ORDER BY (s."startsAt"<=now() AND s."expiresAt">now()) DESC,s."expiresAt",s.id LIMIT 100`;
 return {ok:true,subscriptions:rows.map(s=>({...s,startsAt:s.startsAt.toISOString(),expiresAt:s.expiresAt.toISOString()}))};
 }catch{return {ok:false,error:"تعذر قراءة اشتراكات العميل؛ تحقق من الجوال وأعد المحاولة"};}
}
