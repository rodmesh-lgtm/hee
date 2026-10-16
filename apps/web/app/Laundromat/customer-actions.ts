"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser,getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { ensureLaundryCustomer,laundryCustomerPhone } from "../lib/laundry-customer";
import { LaundryInputError } from "../lib/laundry-domain";
export type LaundryCustomerRow={id:string;name:string;phone:string;notes:string;address:string;orders:number;total:number;outstanding:number};
export async function findLaundryCustomer(value:unknown):Promise<{ok:boolean;customer?:{id:string;name:string;phone:string}|null;error?:string}>{
 const p=z.object({businessId:z.string().uuid(),phone:z.string().max(40)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع رقم الجوال"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundry");if(!b||b.id!==p.data.businessId)return {ok:false,error:"ليست لديك صلاحية هذه المنشأة"};
 try{const phone=laundryCustomerPhone(p.data.phone);const rows=await db.$queryRaw<Array<{id:string;name:string;phone:string}>>`SELECT id,name,phone FROM "LaundryCustomer" WHERE "businessId"=${b.id} AND phone=${phone}`;return {ok:true,customer:rows[0]??null};}catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر البحث عن العميل"};}
}
export async function getLaundryCustomers(value:unknown):Promise<{ok:true;customers:LaundryCustomerRow[];count:number}|{ok:false;error:string}>{
 const p=z.object({businessId:z.string().uuid(),q:z.string().trim().max(100)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع البحث"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryOperations");if(!b||b.id!==p.data.businessId)return {ok:false,error:"دليل العملاء يتطلب صلاحية إشراف المنشأة النشطة"};
 try{let phone=p.data.q;try{phone=laundryCustomerPhone(phone);}catch{}
 const result=await db.$transaction(async tx=>{
 const customers=await tx.$queryRaw<LaundryCustomerRow[]>`SELECT c.id,c.name,c.phone,c.notes,c.address,COUNT(t.id)::int AS orders,COALESCE(SUM(t.total),0)::float8 AS total,COALESCE(SUM(t.total-t.paid),0)::float8 AS outstanding FROM "LaundryCustomer" c LEFT JOIN "LaundryTicket" t ON t."businessId"=c."businessId" AND t."customerId"=c.id WHERE c."businessId"=${b.id} AND (${p.data.q}='' OR POSITION(${p.data.q} IN c.name)>0 OR POSITION(${phone} IN c.phone)>0) GROUP BY c.id ORDER BY c."updatedAt" DESC,c.id LIMIT 100`;
 const count=await tx.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryCustomer" c WHERE c."businessId"=${b.id} AND (${p.data.q}='' OR POSITION(${p.data.q} IN c.name)>0 OR POSITION(${phone} IN c.phone)>0)`;
 return {customers,count:count[0].n};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,...result};
 }catch{return {ok:false,error:"تعذر قراءة دليل العملاء"};}
}
export async function saveLaundryCustomer(value:unknown):Promise<{ok:boolean;error?:string}>{
 const p=z.object({businessId:z.string().uuid(),id:z.string().uuid().optional(),name:z.string().trim().min(2).max(100),phone:z.string().max(40),notes:z.string().trim().max(1000),address:z.string().trim().max(500)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع بيانات العميل"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,"laundryOperations");if(!b||b.id!==p.data.businessId)return {ok:false,error:"تعديل العملاء يتطلب صلاحية إشراف المنشأة النشطة"};
 try{await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const phone=laundryCustomerPhone(p.data.phone);let id=p.data.id;
 if(id){const found=await tx.$queryRaw<Array<{phone:string}>>`SELECT phone FROM "LaundryCustomer" WHERE "businessId"=${b.id} AND id=${id}`;if(!found.length)throw new LaundryInputError("العميل غير موجود في هذه المنشأة");
 // The phone is the deduplication key. Do not silently move/merge another customer's history.
 if(found[0].phone!==phone)throw new LaundryInputError("رقم الجوال معرّف الملف؛ أنشئ ملفًا للرقم الجديد بدل نقل الطلبات السابقة تلقائيًا");
 }else{const old=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryCustomer" WHERE "businessId"=${b.id} AND phone=${phone}`;if(old.length)throw new LaundryInputError("العميل موجود بالفعل؛ افتح ملفه لتعديله");id=(await ensureLaundryCustomer(tx,b.id,p.data.name,phone)).id;}
 await tx.$executeRaw`UPDATE "LaundryCustomer" SET name=${p.data.name},notes=${p.data.notes},address=${p.data.address},"updatedAt"=now() WHERE "businessId"=${b.id} AND id=${id}`;
 await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'customer-save',${id})`;
 },{timeout:15000});revalidatePath("/Laundromat");return {ok:true};}catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ العميل"};}
}
export async function importLaundryCustomers(value:unknown):Promise<{ok:boolean;processed?:number;skipped?:number;more?:boolean;cursor?:string;error?:string}>{
 const p=z.object({businessId:z.string().uuid(),cursor:z.string().uuid().or(z.literal(""))}).safeParse(value);if(!p.success)return {ok:false,error:"راجع بيانات الاستيراد"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,"laundryOperations");if(!b||b.id!==p.data.businessId)return {ok:false,error:"ترحيل العملاء يتطلب صلاحية إشراف المنشأة النشطة"};
 try{const result=await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const rows=await tx.$queryRaw<Array<{id:string;customerName:string;phone:string}>>`SELECT id,"customerName",phone FROM "LaundryTicket" WHERE "businessId"=${b.id} AND "customerId" IS NULL AND id>${p.data.cursor} ORDER BY id LIMIT 25`;
 let processed=0,skipped=0;
 for(const r of rows){let phone:string;try{phone=laundryCustomerPhone(r.phone);}catch{skipped++;continue;}const c=await ensureLaundryCustomer(tx,b.id,r.customerName,phone);await tx.$executeRaw`UPDATE "LaundryTicket" SET "customerId"=${c.id} WHERE "businessId"=${b.id} AND id=${r.id}`;processed++;}
 if(processed)await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'customer-import',${b.id})`;
 return {processed,skipped,more:rows.length===25,cursor:rows.at(-1)?.id??p.data.cursor};
 },{timeout:30000});revalidatePath("/Laundromat");return {ok:true,...result};}catch{return {ok:false,error:"تعذر ترحيل العملاء. يمكنك إعادة المحاولة دون تكرار الملفات"};}
}
export type LaundryCustomerOrder={id:string;number:number;createdAt:string;status:string;total:number;paid:number};
export async function getLaundryCustomerOrders(value:unknown):Promise<{ok:true;orders:LaundryCustomerOrder[]}|{ok:false;error:string}>{
 const p=z.object({businessId:z.string().uuid(),customerId:z.string().uuid()}).safeParse(value);if(!p.success)return {ok:false,error:"حدد العميل"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryOperations");if(!b||b.id!==p.data.businessId)return {ok:false,error:"كشف العميل يتطلب صلاحية إشراف المنشأة النشطة"};
 try{const rows=await db.$queryRaw<Array<Omit<LaundryCustomerOrder,"createdAt">&{createdAt:Date}>>`SELECT id,number,"createdAt",status,total,paid FROM "LaundryTicket" WHERE "businessId"=${b.id} AND "customerId"=${p.data.customerId} ORDER BY "createdAt" DESC,id DESC LIMIT 100`;return {ok:true,orders:rows.map(r=>({...r,createdAt:r.createdAt.toISOString()}))};}catch{return {ok:false,error:"تعذر قراءة طلبات العميل"};}
}
