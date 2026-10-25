"use server";
import {endOrderLiveSessions} from "../../lib/live-view/order-link";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser,getCurrentUserForApiWrite } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { memberCanAccess } from "../../lib/staff-permissions";
import { db } from "../../lib/db";
import { LaundryInputError } from "../../lib/laundry-domain";
import { laundryDeliveryTransition } from "../../lib/laundry-delivery-domain";
import { postLaundrySource } from "../../lib/laundry-ledger";
const key=z.string().uuid();
const command=z.discriminatedUnion("type",[
 z.object({type:z.literal("assign"),number:z.coerce.number().int().positive(),driverId:key,address:z.string().trim().min(8).max(500),consent:z.literal(true)}),
 z.object({type:z.literal("status"),id:key,status:z.enum(["out_for_delivery","delivered","failed","assigned"]),note:z.string().trim().min(4).max(500),recipient:z.string().trim().max(100)}),
]);
export async function laundryDeliveryCommand(value:unknown):Promise<{ok:boolean;error?:string}>{
 const p=command.safeParse(value),scope=z.object({businessId:key,requestId:key}).safeParse(value);if(!p.success||!scope.success)return {ok:false,error:"راجع بيانات مهمة التوصيل والموافقة"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,"laundryDelivery");if(!b||b.id!==scope.data.businessId)return {ok:false,error:"ليست لديك صلاحية توصيل لهذه المنشأة"};
 const owner=b.ownerId===user.id,d=p.data;
 if(d.type==="assign"&&!owner)return {ok:false,error:"إسناد التوصيل متاح للمالك فقط"};
 try{await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const replay=await tx.$queryRaw<Array<{deliveryId:string;driverId:string}>>`SELECT e."deliveryId",j."driverId" FROM "LaundryDeliveryEvent" e JOIN "LaundryDelivery" j ON j."businessId"=e."businessId" AND j.id=e."deliveryId" WHERE e."businessId"=${b.id} AND e."requestId"=${scope.data.requestId}`;
 if(replay[0]){if((!owner&&replay[0].driverId!==user.id)||(d.type==="status"&&replay[0].deliveryId!==d.id))throw new LaundryInputError("العملية غير متاحة لهذا الحساب");return;}
 let id:string,status:string,note:string;
 if(d.type==="assign"){
  const member=await tx.businessMember.findFirst({where:{businessId:b.id,userId:d.driverId,status:"active"},select:{permissions:true}});
  if(!member||!memberCanAccess(member.permissions,"laundryDelivery"))throw new LaundryInputError("اختر موظفًا نشطًا لديه صلاحية توصيل المغسلة");
  const tickets=await tx.$queryRaw<Array<{id:string;customerName:string;phone:string;status:string;paid:number;total:number}>>`SELECT id,"customerName",phone,status,paid,total FROM "LaundryTicket" WHERE "businessId"=${b.id} AND number=${d.number} FOR UPDATE`;
  const t=tickets[0];if(!t||t.status!=="ready"||t.paid!==t.total)throw new LaundryInputError("الإسناد لطلب جاهز ومسدّد بالكامل فقط");
  const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryDelivery" WHERE "businessId"=${b.id} AND "ticketId"=${t.id}`;if(existing.length)throw new LaundryInputError("للطلب مهمة توصيل بالفعل؛ أعد محاولة المهمة المتعذرة من سجلها");
  id=randomUUID();status="assigned";note=`إسناد طلب #${d.number} مع تسجيل موافقة مشاركة عنوان التوصيل`;
  await tx.$executeRaw`INSERT INTO "LaundryDelivery" (id,"businessId","ticketId","driverId","customerName",phone,address,"consentRecordedBy") VALUES (${id},${b.id},${t.id},${d.driverId},${t.customerName},${t.phone},${d.address},${user.id})`;
 }else{
  id=d.id;status=d.status;note=d.note;
  const jobs=await tx.$queryRaw<Array<{ticketId:string;driverId:string;status:string}>>`SELECT "ticketId","driverId",status FROM "LaundryDelivery" WHERE "businessId"=${b.id} AND id=${id} FOR UPDATE`;
  const job=jobs[0];if(!job||(!owner&&job.driverId!==user.id))throw new LaundryInputError("المهمة غير مسندة إلى حسابك");
  if(!laundryDeliveryTransition(job.status,status,owner))throw new LaundryInputError("اتبع مراحل التوصيل؛ إعادة المحاولة متاحة للمالك بعد التعذر فقط");
  if(status==="delivered"){
   if(d.recipient.length<2)throw new LaundryInputError("سجّل اسم مستلم الطلب لتوثيق التسليم");
   const tickets=await tx.$queryRaw<Array<{id:string;number:number;total:number;paid:number;status:string}>>`SELECT id,number,total,paid,status FROM "LaundryTicket" WHERE "businessId"=${b.id} AND id=${job.ticketId} FOR UPDATE`;
   const t=tickets[0];if(!t||t.status!=="ready"||t.paid!==t.total)throw new LaundryInputError("حالة الطلب تغيرت؛ راجع المالك قبل التسليم");
   await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'status',${t.id})`;
   await tx.$executeRaw`UPDATE "LaundryTicket" SET status='delivered',"updatedAt"=now() WHERE "businessId"=${b.id} AND id=${t.id}`;
   await endOrderLiveSessions(tx,b.id,t.id,user.id);
   await postLaundrySource(tx,{businessId:b.id,actorId:user.id,id:t.id,kind:"delivery",amount:t.total,at:new Date(),description:`إيراد توصيل الطلب #${t.number}`});
   note=`المستلم: ${d.recipient}. ${note}`;
  }
  await tx.$executeRaw`UPDATE "LaundryDelivery" SET status=${status},recipient=${status==="delivered"?d.recipient:""},"updatedAt"=now() WHERE "businessId"=${b.id} AND id=${id}`;
 }
 await tx.$executeRaw`INSERT INTO "LaundryDeliveryEvent" (id,"businessId","deliveryId","requestId",status,note,"actorId") VALUES (${randomUUID()},${b.id},${id},${scope.data.requestId},${status},${note},${user.id})`;
 await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},${`delivery-${status}`},${id})`;
 },{timeout:15000});revalidatePath("/Laundromat");revalidatePath("/Laundromat/Delivery");return {ok:true};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ مهمة التوصيل. أعد المحاولة بنفس البيانات."};}
}
export type DeliveryView={owner:boolean;drivers:Array<{id:string;name:string}>;jobs:Array<{id:string;number:number;customerName:string;phone:string;address:string;driverName:string;status:string;recipient:string;updatedAt:string}>;events:Array<{id:string;deliveryId:string;status:string;note:string;createdAt:string}>};
export async function getLaundryDelivery(value:unknown):Promise<{ok:true;view:DeliveryView}|{ok:false;error:string}>{
 const p=z.object({businessId:key}).safeParse(value);if(!p.success)return {ok:false,error:"حدد المنشأة"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};const b=await getActiveBusinessForUser(user.id,"laundryDelivery");if(!b||b.id!==p.data.businessId)return {ok:false,error:"ليست لديك صلاحية توصيل لهذه المنشأة"};
 const owner=b.ownerId===user.id;
 try{const view=await db.$transaction(async tx=>{
 const members=owner?await tx.businessMember.findMany({where:{businessId:b.id,status:"active"},select:{userId:true,permissions:true,user:{select:{name:true}}},take:500}):[];
 const jobs=await tx.$queryRaw<Array<Omit<DeliveryView["jobs"][number],"updatedAt">&{updatedAt:Date}>>`SELECT j.id,t.number,j."customerName",j.phone,j.address,u.name AS "driverName",j.status,j.recipient,j."updatedAt" FROM "LaundryDelivery" j JOIN "LaundryTicket" t ON t."businessId"=j."businessId" AND t.id=j."ticketId" JOIN "User" u ON u.id=j."driverId" WHERE j."businessId"=${b.id} AND (${owner} OR j."driverId"=${user.id}) ORDER BY CASE WHEN j.status IN ('assigned','out_for_delivery','failed') THEN 0 ELSE 1 END,j."updatedAt" DESC LIMIT 100`;
 const events=await tx.$queryRaw<Array<Omit<DeliveryView["events"][number],"createdAt">&{createdAt:Date}>>`SELECT e.id,e."deliveryId",e.status,e.note,e."createdAt" FROM "LaundryDeliveryEvent" e JOIN "LaundryDelivery" j ON j."businessId"=e."businessId" AND j.id=e."deliveryId" WHERE e."businessId"=${b.id} AND (${owner} OR j."driverId"=${user.id}) ORDER BY e."createdAt" DESC,e.id LIMIT 200`;
 return {owner,drivers:members.filter(m=>memberCanAccess(m.permissions,"laundryDelivery")).map(m=>({id:m.userId,name:m.user.name??"موظف التوصيل"})),jobs:jobs.map(j=>({...j,updatedAt:j.updatedAt.toISOString()})),events:events.map(e=>({...e,createdAt:e.createdAt.toISOString()}))};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,view};}catch{return {ok:false,error:"تعذر قراءة مهام التوصيل"};}
}
