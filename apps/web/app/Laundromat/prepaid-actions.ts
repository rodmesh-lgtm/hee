"use server";
import { calendarSubscriptionPeriod } from "../lib/accounting-dates";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser,getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { laundryCustomerPhone } from "../lib/laundry-customer";
import { LaundryInputError,moneyToHalalas } from "../lib/laundry-domain";
import { laundryReportRange } from "../lib/laundry-report";
import { postLaundryJournal,postLaundrySource } from "../lib/laundry-ledger";
import { prepaidCashLines,prepaidRemaining } from "../lib/laundry-prepaid-domain";
import { packagePeriod,assertSubscriptionServices,type AccountingPackage,type PackageKind } from "../lib/accounting-packages";
const key=z.string().uuid();
const command=z.discriminatedUnion("type",[
 z.object({type:z.literal("purchase"),phone:z.string().max(40),packageId:key.optional(),durationMonths:z.union([z.coerce.number().int().min(1).max(12),z.enum(["plan","custom"])]).optional(),starts:z.string().max(10).optional(),name:z.string().trim().min(2).max(100),amount:z.string(),expires:z.string().max(10),method:z.enum(["cash","card","transfer"])}),
 z.object({type:z.literal("redeem"),id:key,number:z.coerce.number().int().positive(),amount:z.string()}),
 z.object({type:z.literal("refund"),id:key,amount:z.string(),method:z.enum(["cash","transfer"]),reason:z.string().trim().min(4).max(200)}),
]);
export async function laundryPrepaidCommand(value:unknown):Promise<{ok:boolean;error?:string;id?:string}>{
 const p=command.safeParse(value),scope=z.object({businessId:key,requestId:key}).safeParse(value);
 if(!p.success||!scope.success)return {ok:false,error:"راجع بيانات الاشتراك"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==scope.data.businessId)return {ok:false,error:"إدارة الاشتراكات تتطلب صلاحية محاسبة المنشأة النشطة"};
 const d=p.data,rid=scope.data.requestId;
 try{const id=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
  const replay=await tx.$queryRaw<Array<{prepaidId:string;kind:string}>>`SELECT "prepaidId",kind FROM "LaundryPrepaidMovement" WHERE "businessId"=${b.id} AND "requestId"=${rid}`;
  if(replay[0]){if(replay[0].kind!==d.type||(d.type!=="purchase"&&replay[0].prepaidId!==d.id))throw new LaundryInputError("معرّف العملية مستخدم لعملية أخرى");return replay[0].prepaidId;}
  const book=await tx.$queryRaw<Array<{initializedAt:Date|null}>>`SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId"=${b.id}`;
  if(!book[0]?.initializedAt)throw new LaundryInputError("أكمل تهيئة دفتر المحاسبة قبل تسجيل الاشتراكات");
  let amount=moneyToHalalas(d.amount);if(amount<=0)throw new LaundryInputError("أدخل مبلغًا أكبر من صفر");
  const now=new Date();let units=0;let id:string,paymentId:string|null=null,reason:string,method:string;
  if(d.type==="purchase"){
   const phone=laundryCustomerPhone(d.phone);
   const customers=await tx.$queryRaw<Array<{id:string;name:string}>>`SELECT id,name FROM "LaundryCustomer" WHERE "businessId"=${b.id} AND phone=${phone}`;
   if(!customers[0])throw new LaundryInputError("أضف العميل أولًا من دليل العملاء ثم سجّل اشتراكه");
   let name=d.name,description="",serviceIds:string[]=[],startsAt=now;let kind:PackageKind="credit",unitsIncluded:number|null=null;
   let expiresAt:Date;
   if(d.packageId){
    const plans=await tx.$queryRaw<AccountingPackage[]>`SELECT * FROM "AccountingPackage" WHERE "businessId"=${b.id} AND id=${d.packageId} AND active=TRUE`;
    const plan=plans[0];if(!plan)throw new LaundryInputError("الباقة غير متاحة للاشتراك في هذه المنشأة");
    if(amount!==plan.amount)throw new LaundryInputError("تغير سعر الباقة؛ حدّث الصفحة وراجع المبلغ المستلم");
    ({startsAt,expiresAt}=typeof d.durationMonths==="number"?calendarSubscriptionPeriod(d.starts??"",d.durationMonths,now):packagePeriod(d.starts??"",plan.durationDays,now));
    name=plan.name;description=plan.description;serviceIds=plan.serviceIds;amount=plan.amount;kind=plan.kind??"credit";unitsIncluded=plan.unitsIncluded??null;units=unitsIncluded??0;
   }else{
    if(typeof d.durationMonths==="number")({startsAt,expiresAt}=calendarSubscriptionPeriod(d.starts??"",d.durationMonths,now));
    else {
     expiresAt=laundryReportRange(d.expires,d.expires).end;
     if(d.starts){startsAt=packagePeriod(d.starts,1,now).startsAt;}
     if(expiresAt<=startsAt||expiresAt<=now||expiresAt.getTime()>startsAt.getTime()+367*86400000)throw new LaundryInputError("حدد نهاية بعد البداية وخلال سنة منها");
    }
   }
   id=randomUUID();reason=`شراء اشتراك: ${name}`;method=d.method;
   await tx.$executeRaw`INSERT INTO "LaundryPrepaid" (id,"businessId","customerId","customerName","requestId",name,amount,remaining,"startsAt","expiresAt","packageId","packageDescription","serviceIds",kind,"unitsIncluded","unitsRemaining","createdBy") VALUES (${id},${b.id},${customers[0].id},${customers[0].name},${rid},${name},${amount},${amount},${startsAt},${expiresAt},${d.packageId??null},${description},${JSON.stringify(serviceIds)}::jsonb,${kind},${unitsIncluded},${unitsIncluded},${user.id})`;
  }else{
   id=d.id;
   const rows=await tx.$queryRaw<Array<{customerId:string;remaining:number;expiresAt:Date;startsAt:Date;serviceIds:string[];kind:PackageKind;unitsRemaining:number|null}>>`SELECT "customerId",remaining,"expiresAt","startsAt","serviceIds",kind,"unitsRemaining" FROM "LaundryPrepaid" WHERE "businessId"=${b.id} AND id=${id} FOR UPDATE`;
   const sub=rows[0];if(!sub)throw new LaundryInputError("الاشتراك غير موجود في هذه المنشأة");
   let outstanding:number|undefined;
   if(sub.kind!=="credit"){if(d.type==="redeem")throw new LaundryInputError("باقات العدد تُستخدم تلقائيًا في الكاشير عند إنشاء الطلب");if(amount!==sub.remaining)throw new LaundryInputError("استرداد باقة العدد يغلق جميع الوحدات المتبقية؛ أدخل كامل القيمة غير المستخدمة");units=sub.unitsRemaining??0;}
   if(d.type==="redeem"){
    const tickets=await tx.$queryRaw<Array<{id:string;customerId:string;total:number;paid:number;items:Array<{serviceId:string}>}>>`SELECT id,"customerId",total,paid,items FROM "LaundryTicket" WHERE "businessId"=${b.id} AND number=${d.number} FOR UPDATE`;
    const ticket=tickets[0];if(!ticket||ticket.customerId!==sub.customerId)throw new LaundryInputError("الطلب لا يخص عميل هذا الاشتراك");
    if(sub.startsAt>now)throw new LaundryInputError("لم تبدأ صلاحية الاشتراك بعد");
    assertSubscriptionServices(sub.serviceIds,ticket.items);
    outstanding=ticket.total-ticket.paid;
    prepaidRemaining(sub.remaining,amount,sub.expiresAt,now,"redeem",outstanding);
    paymentId=randomUUID();method="prepaid";reason=`استخدام اشتراك لسداد طلب #${d.number}`;
    await tx.$executeRaw`INSERT INTO "LaundryPayment" (id,"businessId","ticketId","requestId",amount,method,"createdBy") VALUES (${paymentId},${b.id},${ticket.id},${rid},${amount},'prepaid',${user.id})`;
    await tx.$executeRaw`UPDATE "LaundryTicket" SET paid=paid+${amount},"updatedAt"=now() WHERE "businessId"=${b.id} AND id=${ticket.id}`;
    await postLaundrySource(tx,{businessId:b.id,actorId:user.id,id:paymentId,kind:"payment",amount,method,at:now,description:reason});
   }else{method=d.method;reason=`استرداد اشتراك: ${d.reason}`;}
   const remaining=prepaidRemaining(sub.remaining,amount,sub.expiresAt,now,d.type,outstanding);
   await tx.$executeRaw`UPDATE "LaundryPrepaid" SET remaining=${remaining},"unitsRemaining"=CASE WHEN kind='credit' THEN NULL ELSE 0 END WHERE "businessId"=${b.id} AND id=${id}`;
  }
  const movementId=randomUUID();
  await tx.$executeRaw`INSERT INTO "LaundryPrepaidMovement" (id,"businessId","prepaidId","requestId",kind,amount,method,"paymentId",reason,units,"createdBy") VALUES (${movementId},${b.id},${id},${rid},${d.type},${amount},${method},${paymentId},${reason},${units},${user.id})`;
  if(d.type!=="redeem")await postLaundryJournal(tx,{businessId:b.id,actorId:user.id,sourceKey:`prepaid:${movementId}`,description:reason,effectiveAt:now,lines:prepaidCashLines(d.type,amount,method)});
  await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},${`prepaid-${d.type}`},${id})`;
  return id;
 },{timeout:15000});revalidatePath("/Laundromat");revalidatePath("/Accounting");return {ok:true,id};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ الاشتراك. أعد المحاولة بنفس البيانات دون تكرار العملية."};}
}
export type PrepaidView={subscriptions:Array<{id:string;name:string;customerName:string;phone:string;amount:number;remaining:number;expiresAt:string;startsAt:string;serviceIds:string[];packageId:string|null;kind:PackageKind;unitsIncluded:number|null;unitsRemaining:number|null}>,movements:Array<{id:string;name:string;customerName:string;kind:string;units:number;amount:number;method:string;reason:string;createdAt:string}>};
export async function getLaundryPrepaid(value:unknown):Promise<{ok:true;view:PrepaidView}|{ok:false;error:string}>{
 const p=z.object({businessId:key,phone:z.string().max(40)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع رقم العميل"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId)return {ok:false,error:"الاشتراكات تتطلب صلاحية محاسبة المنشأة النشطة"};
 try{const phone=p.data.phone.trim()?laundryCustomerPhone(p.data.phone):"";
 const view=await db.$transaction(async tx=>{
 const subscriptions=await tx.$queryRaw<Array<Omit<PrepaidView["subscriptions"][number],"expiresAt"|"startsAt">&{expiresAt:Date;startsAt:Date}>>`SELECT s.id,s.name,c.name AS "customerName",c.phone,s.amount,s.remaining,s."expiresAt",s."startsAt",s."serviceIds",s."packageId",s.kind,s."unitsIncluded",s."unitsRemaining" FROM "LaundryPrepaid" s JOIN "LaundryCustomer" c ON c."businessId"=s."businessId" AND c.id=s."customerId" WHERE s."businessId"=${b.id} AND (${phone}='' OR c.phone=${phone}) ORDER BY s."createdAt" DESC,s.id LIMIT 100`;
 const movements=await tx.$queryRaw<Array<Omit<PrepaidView["movements"][number],"createdAt">&{createdAt:Date}>>`SELECT m.id,s.name,s."customerName",m.kind,m.units,m.amount,m.method,m.reason,m."createdAt" FROM "LaundryPrepaidMovement" m JOIN "LaundryPrepaid" s ON s."businessId"=m."businessId" AND s.id=m."prepaidId" JOIN "LaundryCustomer" c ON c."businessId"=s."businessId" AND c.id=s."customerId" WHERE m."businessId"=${b.id} AND (${phone}='' OR c.phone=${phone}) ORDER BY m."createdAt" DESC,m.id LIMIT 100`;
 return {subscriptions:subscriptions.map(s=>({...s,expiresAt:s.expiresAt.toISOString(),startsAt:s.startsAt.toISOString()})),movements:movements.map(m=>({...m,createdAt:m.createdAt.toISOString()}))};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,view};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر قراءة الاشتراكات"};}
}
