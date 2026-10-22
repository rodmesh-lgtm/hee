"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser,getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError,moneyToHalalas } from "../lib/laundry-domain";
import { receiveLaundryInventoryPurchase } from "../lib/laundry-stock-valuation";
import { postLaundryJournal } from "../lib/laundry-ledger";
const key=z.string().uuid();
const commands=z.discriminatedUnion("type",[
 z.object({type:z.literal("supplier"),name:z.string().trim().min(2).max(100),phone:z.string().trim().max(40),notes:z.string().trim().max(500)}),
 z.object({type:z.literal("purchase"),supplierId:key,reference:z.string().trim().min(1).max(80),description:z.string().trim().min(4).max(500),amount:z.string(),kind:z.enum(["operating","inventory"]).default("operating"),itemId:key.optional(),warehouseId:key.optional(),quantity:z.string().max(20).optional()}),
 z.object({type:z.literal("payment"),id:key,amount:z.string(),method:z.enum(["cash","transfer"]),reference:z.string().trim().min(4).max(200)}),
]);
export async function laundryPurchaseCommand(value:unknown):Promise<{ok:boolean;error?:string}>{
 const p=commands.safeParse(value),scope=z.object({businessId:key,requestId:key}).safeParse(value);if(!p.success||!scope.success)return {ok:false,error:"راجع بيانات المورد أو الفاتورة"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==scope.data.businessId)return {ok:false,error:"المشتريات تتطلب صلاحية محاسبة المنشأة النشطة"};
 const d=p.data,rid=scope.data.requestId;
 try{await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
  const old=await tx.$queryRaw<Array<{action:string;targetId:string}>>`SELECT action,"targetId" FROM "LaundryAudit" WHERE "businessId"=${b.id} AND id=${rid}`;
  if(old[0]){if(old[0].action!==`purchase-${d.type}`||(d.type==="payment"&&old[0].targetId!==d.id))throw new LaundryInputError("معرّف العملية مستخدم");return;}
  let target:string;
  if(d.type==="supplier"){
   const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundrySupplier" WHERE "businessId"=${b.id} AND name=${d.name}`;if(existing.length)throw new LaundryInputError("اسم المورد مسجل بالفعل");
   target=randomUUID();await tx.$executeRaw`INSERT INTO "LaundrySupplier" (id,"businessId",name,phone,notes) VALUES (${target},${b.id},${d.name},${d.phone},${d.notes})`;
  }else{
   const books=await tx.$queryRaw<Array<{initializedAt:Date|null}>>`SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId"=${b.id}`;if(!books[0]?.initializedAt)throw new LaundryInputError("أكمل تهيئة دفتر المحاسبة قبل المشتريات");
   const amount=moneyToHalalas(d.amount);if(amount<=0)throw new LaundryInputError("أدخل مبلغًا أكبر من صفر");
   const now=new Date();
   if(d.type==="purchase"){
    const suppliers=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundrySupplier" WHERE "businessId"=${b.id} AND id=${d.supplierId}`;if(!suppliers.length)throw new LaundryInputError("المورد غير موجود في المنشأة");
    const duplicate=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryPurchase" WHERE "businessId"=${b.id} AND "supplierId"=${d.supplierId} AND reference=${d.reference}`;if(duplicate.length)throw new LaundryInputError("رقم فاتورة المورد مسجل بالفعل");
    target=randomUUID();await tx.$executeRaw`INSERT INTO "LaundryPurchase" (id,"businessId","supplierId","requestId",reference,description,total,"createdBy",kind) VALUES (${target},${b.id},${d.supplierId},${rid},${d.reference},${d.description},${amount},${user.id},${d.kind})`;
    if(d.kind==="inventory"){
     if(!d.itemId||!d.warehouseId||!d.quantity)throw new LaundryInputError("حدد مادة الشراء ومستودعها وكميتها");
     await receiveLaundryInventoryPurchase(tx,{businessId:b.id,actorId:user.id,requestId:rid,purchaseId:target,itemId:d.itemId,warehouseId:d.warehouseId,quantity:d.quantity,value:amount,reason:`شراء ${d.reference}: ${d.description}`});
    }
    await postLaundryJournal(tx,{businessId:b.id,actorId:user.id,sourceKey:`purchase:${target}`,description:`شراء ${d.kind==="inventory"?"مخزني":"تشغيلي"} ${d.reference}: ${d.description}`.slice(0,300),effectiveAt:now,lines:[{accountCode:d.kind==="inventory"?"1300":"5000",debit:amount,credit:0},{accountCode:"2000",debit:0,credit:amount}]});
   }else{
    target=d.id;const rows=await tx.$queryRaw<Array<{total:number;paid:number;reference:string}>>`SELECT total,paid,reference FROM "LaundryPurchase" WHERE "businessId"=${b.id} AND id=${target} FOR UPDATE`;
    if(!rows[0])throw new LaundryInputError("الفاتورة غير موجودة في المنشأة");if(amount>rows[0].total-rows[0].paid)throw new LaundryInputError("الدفعة تتجاوز المتبقي للمورد");
    const id=randomUUID();await tx.$executeRaw`INSERT INTO "LaundrySupplierPayment" (id,"businessId","purchaseId","requestId",amount,method,reference,"createdBy") VALUES (${id},${b.id},${target},${rid},${amount},${d.method},${d.reference},${user.id})`;
    await tx.$executeRaw`UPDATE "LaundryPurchase" SET paid=paid+${amount} WHERE "businessId"=${b.id} AND id=${target}`;
    await postLaundryJournal(tx,{businessId:b.id,actorId:user.id,sourceKey:`supplier-payment:${id}`,description:`سداد مورد ${rows[0].reference}: ${d.reference}`.slice(0,300),effectiveAt:now,lines:[{accountCode:"2000",debit:amount,credit:0},{accountCode:d.method==="cash"?"1100":"1120",debit:0,credit:amount}]});
   }
  }
  await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${rid},${b.id},${user.id},${`purchase-${d.type}`},${target})`;
 },{timeout:15000});revalidatePath("/Laundromat");revalidatePath("/Accounting");return {ok:true};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ عملية المشتريات. أعد المحاولة بنفس البيانات."};}
}
export type PurchaseView={suppliers:Array<{id:string;name:string;phone:string;total:number;paid:number}>,purchases:Array<{id:string;supplierId:string;supplierName:string;reference:string;description:string;kind:"operating"|"inventory";total:number;paid:number;createdAt:string}>,payments:Array<{id:string;reference:string;invoice:string;supplierName:string;amount:number;method:string;createdAt:string}>};
export async function getLaundryPurchases(value:unknown):Promise<{ok:true;view:PurchaseView}|{ok:false;error:string}>{
 const p=z.object({businessId:key,supplierId:key.or(z.literal(""))}).safeParse(value);if(!p.success)return {ok:false,error:"راجع المورد"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId)return {ok:false,error:"المشتريات تتطلب صلاحية محاسبة المنشأة النشطة"};
 try{const view=await db.$transaction(async tx=>{
 const suppliers=await tx.$queryRaw<PurchaseView["suppliers"]>`SELECT s.id,s.name,s.phone,COALESCE(SUM(p.total),0)::float8 AS total,COALESCE(SUM(p.paid),0)::float8 AS paid FROM "LaundrySupplier" s LEFT JOIN "LaundryPurchase" p ON p."businessId"=s."businessId" AND p."supplierId"=s.id WHERE s."businessId"=${b.id} GROUP BY s.id ORDER BY s.name LIMIT 500`;
 const purchases=await tx.$queryRaw<Array<Omit<PurchaseView["purchases"][number],"createdAt">&{createdAt:Date}>>`SELECT p.id,p."supplierId",s.name AS "supplierName",p.reference,p.description,p.kind,p.total,p.paid,p."createdAt" FROM "LaundryPurchase" p JOIN "LaundrySupplier" s ON s."businessId"=p."businessId" AND s.id=p."supplierId" WHERE p."businessId"=${b.id} AND (${p.data.supplierId}='' OR p."supplierId"=${p.data.supplierId}) ORDER BY p."createdAt" DESC,p.id LIMIT 100`;
 const payments=await tx.$queryRaw<Array<Omit<PurchaseView["payments"][number],"createdAt">&{createdAt:Date}>>`SELECT m.id,m.reference,p.reference AS invoice,s.name AS "supplierName",m.amount,m.method,m."createdAt" FROM "LaundrySupplierPayment" m JOIN "LaundryPurchase" p ON p."businessId"=m."businessId" AND p.id=m."purchaseId" JOIN "LaundrySupplier" s ON s."businessId"=p."businessId" AND s.id=p."supplierId" WHERE m."businessId"=${b.id} AND (${p.data.supplierId}='' OR s.id=${p.data.supplierId}) ORDER BY m."createdAt" DESC,m.id LIMIT 100`;
 return {suppliers,purchases:purchases.map(x=>({...x,createdAt:x.createdAt.toISOString()})),payments:payments.map(x=>({...x,createdAt:x.createdAt.toISOString()}))};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,view};}catch{return {ok:false,error:"تعذر قراءة المشتريات"};}
}
