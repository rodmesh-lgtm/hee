"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { resolveLaundryPreset } from "../lib/laundry-catalog";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError, laundryLines, moneyToHalalas, nextLaundryStatus, type LaundryService, type LaundryTicket } from "../lib/laundry-domain";

const key = z.string().uuid();
const command = z.discriminatedUnion("type", [
  z.object({type:z.literal("catalog"),requestId:key,operation:z.enum(["wash","iron","wash_iron","dry"]),items:z.array(z.object({presetId:z.string().max(50),price:z.string()})).min(1).max(60)}),
  z.object({ type: z.literal("service"), name: z.string().trim().min(2).max(100), category: z.string().trim().min(2).max(50), price: z.string(), requestId: key }),
  z.object({ type: z.literal("archive"), id: key, requestId: key }),
  z.object({ type: z.literal("order"), requestId: key, customerName: z.string().trim().min(2).max(100), phone: z.string().regex(/^\+?[0-9]{9,15}$/), dueAt: z.string().datetime({ offset: true }), notes: z.string().trim().max(1000), paid: z.string(), method: z.enum(["cash","card","transfer"]), items: z.array(z.object({serviceId:key,quantity:z.number().int().min(1).max(100)})).min(1).max(80) }),
  z.object({ type: z.literal("payment"), requestId: key, id: key, amount: z.string(), method: z.enum(["cash","card","transfer"]) }),
  z.object({ type: z.literal("status"), requestId: key, id: key, status: z.enum(["received","processing","ready","delivered"]) }),
  z.object({ type: z.literal("expense"), requestId: key, description: z.string().trim().min(2).max(200), amount: z.string() }),
]);
export async function laundryCommand(value: unknown): Promise<{ok:boolean;error?:string;id?:string}> {
  const parsed = command.safeParse(value);
  if (!parsed.success) return {ok:false,error:"راجع الحقول المطلوبة وتنسيق الجوال والمبالغ"};
  const user = await getCurrentUserForApiWrite();
  if (!user) return {ok:false,error:"يرجى تسجيل الدخول بحساب موثّق"};
  const business = await getActiveBusinessForUser(user.id,"laundry");
  if (!business) return {ok:false,error:"ليس لديك صلاحية كاشير المغسلة"};
  const scope=z.object({businessId:key}).safeParse(value);
  if(!scope.success || scope.data.businessId!==business.id) return {ok:false,error:"تغيرت المنشأة النشطة. حدّث الصفحة قبل حفظ العملية."};
  const data = parsed.data;
  if (["service","catalog","archive","expense"].includes(data.type) && business.ownerId !== user.id) return {ok:false,error:"هذه العملية متاحة لمالك المنشأة فقط"};
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${business.id}`}))`;
      let id = "";
      if (data.type === "catalog") {
        id=data.requestId;
        const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryAudit" WHERE "businessId"=${business.id} AND "id"=${id} AND "action"='catalog'`;
        if(replay.length)return {id};
        if(new Set(data.items.map(x=>x.presetId)).size!==data.items.length)throw new LaundryInputError("توجد أصناف مكررة");
        const presets=data.items.map(item=>{
          const preset=resolveLaundryPreset(item.presetId,data.operation);
          if(!preset)throw new LaundryInputError("الصنف غير موجود في الدليل");
          const price=moneyToHalalas(item.price);
          if(price<=0)throw new LaundryInputError("حدد سعرًا أكبر من صفر لكل صنف ترغب بتفعيله");
          return {id:randomUUID(),name:preset.name,category:preset.category,price};
        });
        // One database round trip keeps full-catalog setup within the transaction deadline.
        await tx.$executeRaw`INSERT INTO "LaundryService" ("id","businessId","name","category","price")
          SELECT p.id,${business.id},p.name,p.category,p.price
          FROM jsonb_to_recordset(${JSON.stringify(presets)}::jsonb) AS p(id text,name text,category text,price int)
          WHERE NOT EXISTS (SELECT 1 FROM "LaundryService" s WHERE s."businessId"=${business.id} AND s."name"=p.name AND s."active"=TRUE)`;
      } else if (data.type === "service") {
        id=data.requestId; const price=moneyToHalalas(data.price);
        await tx.$executeRaw`INSERT INTO "LaundryService" ("id","businessId","name","category","price") VALUES (${id},${business.id},${data.name},${data.category},${price}) ON CONFLICT ("id") DO NOTHING`;
      } else if (data.type === "archive") {
        id=data.id;
        const changed=await tx.$executeRaw`UPDATE "LaundryService" SET "active"=FALSE WHERE "businessId"=${business.id} AND "id"=${id}`;
        if (!changed) throw new LaundryInputError("الخدمة غير موجودة");
      } else if (data.type === "order") {
        const previous=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "requestId"=${data.requestId}`;
        if(previous[0]) return {id:previous[0].id};
        const dueAt=new Date(data.dueAt);
        if(dueAt.getTime()<Date.now()-60000 || dueAt.getTime()>Date.now()+366*86400000) throw new LaundryInputError("حدد موعد تسليم قادمًا خلال سنة");
        const catalog=await tx.$queryRaw<LaundryService[]>`SELECT * FROM "LaundryService" WHERE "businessId"=${business.id} AND "active"=TRUE`;
        const lines=laundryLines(data.items,catalog), total=lines.reduce((s,x)=>s+x.total,0), paid=moneyToHalalas(data.paid);
        if(paid>total) throw new LaundryInputError("الدفعة أكبر من إجمالي الطلب");
        const rows=await tx.$queryRaw<Array<{number:number}>>`SELECT COALESCE(MAX("number"),0)+1 AS "number" FROM "LaundryTicket" WHERE "businessId"=${business.id}`;
        id=randomUUID();
        await tx.$executeRaw`INSERT INTO "LaundryTicket" ("id","businessId","number","requestId","customerName","phone","items","total","paid","dueAt","notes","createdBy") VALUES (${id},${business.id},${rows[0].number},${data.requestId},${data.customerName},${data.phone},${JSON.stringify(lines)}::jsonb,${total},${paid},${dueAt},${data.notes},${user.id})`;
        if(paid>0) await tx.$executeRaw`INSERT INTO "LaundryPayment" ("id","businessId","ticketId","requestId","amount","method","createdBy") VALUES (${randomUUID()},${business.id},${id},${data.requestId},${paid},${data.method},${user.id})`;
      } else if(data.type==="expense") {
        id=data.requestId; const amount=moneyToHalalas(data.amount);
        if(amount<=0) throw new LaundryInputError("أدخل مبلغًا أكبر من صفر");
        await tx.$executeRaw`INSERT INTO "LaundryExpense" ("id","businessId","requestId","description","amount","createdBy") VALUES (${id},${business.id},${data.requestId},${data.description},${amount},${user.id}) ON CONFLICT ("businessId","requestId") DO NOTHING`;
      } else {
        id=data.id;
        const rows=await tx.$queryRaw<LaundryTicket[]>`SELECT * FROM "LaundryTicket" WHERE "id"=${id} AND "businessId"=${business.id} FOR UPDATE`;
        const ticket=rows[0]; if(!ticket) throw new LaundryInputError("الطلب غير موجود في منشأتك");
        if(data.type==="payment") {
          const old=await tx.$queryRaw<Array<{ticketId:string}>>`SELECT "ticketId" FROM "LaundryPayment" WHERE "businessId"=${business.id} AND "requestId"=${data.requestId}`;
          if(old[0]) {if(old[0].ticketId!==id) throw new LaundryInputError("معرّف الدفعة مستخدم");return {id};}
          const amount=moneyToHalalas(data.amount);
          if(amount<=0 || amount>ticket.total-ticket.paid) throw new LaundryInputError("الدفعة يجب ألا تتجاوز المبلغ المتبقي");
          await tx.$executeRaw`INSERT INTO "LaundryPayment" ("id","businessId","ticketId","requestId","amount","method","createdBy") VALUES (${randomUUID()},${business.id},${id},${data.requestId},${amount},${data.method},${user.id})`;
          await tx.$executeRaw`UPDATE "LaundryTicket" SET "paid"="paid"+${amount},"updatedAt"=now() WHERE "id"=${id} AND "businessId"=${business.id}`;
        } else {
          if(ticket.status===data.status)return {id};
          if(!nextLaundryStatus(ticket.status,data.status,ticket.total-ticket.paid)) throw new LaundryInputError("اتبع مراحل الطلب بالترتيب، وسدّد المتبقي قبل التسليم");
          await tx.$executeRaw`UPDATE "LaundryTicket" SET "status"=${data.status},"updatedAt"=now() WHERE "id"=${id} AND "businessId"=${business.id}`;
        }
      }
      await tx.$executeRaw`INSERT INTO "LaundryAudit" ("id","businessId","actorId","action","targetId") VALUES (${data.type==="catalog"?data.requestId:randomUUID()},${business.id},${user.id},${data.type},${id})`;
      return {id};
    });
    revalidatePath("/Laundromat");
    return {ok:true,id:result.id};
  } catch(error) {
    return {ok:false,error:error instanceof LaundryInputError?error.message:"تعذر حفظ العملية. أعد المحاولة؛ لن تتكرر الدفعة أو الطلب."};
  }
}
