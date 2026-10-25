"use server";
import { assertInvoiceCapacity,CommercialLimitError } from "../lib/commercial-usage";
import { cashierUrgentEnabled,hasClothingCatalogue } from "../lib/cashier-settings";
import { normalizePageModulesForPersistence } from "../lib/page-modules";
import { enqueueLaundryReady } from "../lib/whatsapp/laundry-ready";
import { quoteSubscriberOrder,type SubscriberBalance } from "../lib/accounting-packages";
import { collectionAllocations } from "../lib/accounting-collection";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { ensureLaundryCustomer } from "../lib/laundry-customer";
import { postLaundrySource } from "../lib/laundry-ledger";
import { resolveLaundryPreset } from "../lib/laundry-catalog";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError, withLaundryServiceSpeed, laundryPricedLines, laundryPriceToken, moneyToHalalas, nextLaundryStatus, type LaundryService, type LaundryTicket } from "../lib/laundry-domain";

const key = z.string().uuid();
const command = z.discriminatedUnion("type", [
  z.object({type:z.literal("product"),requestId:key,name:z.string().trim().min(2).max(80),category:z.string().trim().min(2).max(50),wash_iron:z.string(),iron:z.string()}),
  z.object({type:z.literal("catalog"),requestId:key,operation:z.enum(["wash","iron","wash_iron","dry"]).optional(),items:z.array(z.object({presetId:z.string().max(50),operation:z.enum(["wash","iron","wash_iron","dry"]).optional(),price:z.string()})).min(1).max(120)}),
  z.object({ type: z.literal("service"), name: z.string().trim().min(2).max(100), category: z.string().trim().min(2).max(50), price: z.string(), requestId: key }),
  z.object({type:z.literal("urgent-settings"),enabled:z.boolean(),requestId:key}),
  z.object({ type:z.literal("urgent-price"),id:key,price:z.string(),requestId:key }),
  z.object({ type: z.literal("archive"), id: key, requestId: key }),
  z.object({ type: z.literal("order"), serviceSpeed:z.enum(["normal","urgent"]).default("normal"),priceToken:z.string().max(30000).optional(), useSubscription:z.boolean().default(false),subscriptionToken:z.string().max(30000).optional(),subscriptionCovered:z.coerce.number().int().default(0), readyNotifyConsent:z.boolean().default(false), requestId: key, customerName: z.string().trim().min(2).max(100), phone: z.string().min(8).max(40), dueAt: z.string().datetime({ offset: true }), notes: z.string().trim().max(1000), paid: z.string(), method: z.enum(["cash","card","transfer","mixed"]), cashPaid: z.string().default("0"), items: z.array(z.object({serviceId:key,quantity:z.number().int().min(1).max(100)})).min(1).max(80) }),
  z.object({ type: z.literal("payment"), requestId: key, id: key, amount: z.string(), method: z.enum(["cash","card","transfer","mixed"]), cashPaid: z.string().default("0") }),
  z.object({ type: z.literal("status"), requestId: key, id: key, status: z.enum(["received","processing","ready","delivered"]) }),
  z.object({ type: z.literal("expense"), requestId: key, description: z.string().trim().min(2).max(200), amount: z.string(), method:z.enum(["cash","transfer","unspecified"]).default("unspecified") }),
]);
export async function laundryCommand(value: unknown): Promise<{ok:boolean;error?:string;id?:string}> {
  const parsed = command.safeParse(value);
  if (!parsed.success) return {ok:false,error:"راجع الحقول المطلوبة وتنسيق الجوال والمبالغ"};
  const user = await getCurrentUserForApiWrite();
  if (!user) return {ok:false,error:"يرجى تسجيل الدخول بحساب موثّق"};
  const business = await getActiveBusinessForUser(user.id,"laundry");
  if (!business) return {ok:false,error:"ليس لديك صلاحية كاشير المنشأة"};
  const scope=z.object({businessId:key}).safeParse(value);
  if(!scope.success || scope.data.businessId!==business.id) return {ok:false,error:"تغيرت المنشأة النشطة. حدّث الصفحة قبل حفظ العملية."};
  const data = parsed.data;
  if (["service","catalog","product","archive","expense","urgent-price"].includes(data.type) && business.ownerId !== user.id) return {ok:false,error:"هذه العملية متاحة لمالك المنشأة فقط"};
  if(data.type==="urgent-settings"&&business.ownerId!==user.id)return {ok:false,error:"إعداد خيارات الخدمة متاح للمالك فقط"};
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${business.id}`}))`;
      let id = "";
      if(data.type==="urgent-settings") {
        id=data.requestId;
        const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryAudit" WHERE "businessId"=${business.id} AND id=${id} AND action='urgent-settings'`;
        if(replay.length)return {id};
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`page-modules:${business.id}`}))`;
        const current=await tx.business.findFirst({where:{id:business.id,ownerId:user.id,deletedAt:null},select:{pageModules:true,businessType:true,updatedAt:true}});
        if(!current)throw new LaundryInputError("المنشأة غير متاحة");
        const modules=normalizePageModulesForPersistence(current.pageModules,current.businessType).map(module=>module.id==="contact"?{...module,config:{...module.config,cashierUrgentEnabled:data.enabled}}:module);
        const changed=await tx.business.updateMany({where:{id:business.id,ownerId:user.id,deletedAt:null,updatedAt:current.updatedAt},data:{pageModules:JSON.parse(JSON.stringify(modules))}});
        if(changed.count!==1)throw new LaundryInputError("تغيرت الإعدادات؛ حدّث الصفحة وأعد المحاولة");
      } else if (data.type === "catalog" || data.type === "product") {
        id=data.requestId;
        const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryAudit" WHERE "businessId"=${business.id} AND "id"=${id} AND "action"=${data.type}`;
        if(replay.length)return {id};
        const items=data.type==="catalog"?data.items.map(item=>({...item,operation:item.operation??data.operation})):(["wash_iron","iron"] as const).filter(operation=>data[operation].trim()!=="").map(operation=>({presetId:"custom",operation,price:data[operation]}));
        if(!items.length)throw new LaundryInputError("أدخل سعر غسيل وكوي أو كوي فقط");
        if(new Set(items.map(x=>`${x.presetId}:${x.operation}`)).size!==items.length)throw new LaundryInputError("توجد أصناف مكررة");
        const presets=items.map(item=>{
          const preset=data.type==="catalog"?resolveLaundryPreset(item.presetId,item.operation??""):{name:`${data.name} — ${item.operation==="iron"?"كوي":"غسيل وكوي"}`,category:data.category};
          if(!preset)throw new LaundryInputError("الصنف غير موجود في الدليل");
          const price=moneyToHalalas(item.price);
          if(price<=0)throw new LaundryInputError("حدد سعرًا أكبر من صفر لكل صنف ترغب بتفعيله");
          return {id:randomUUID(),name:preset.name,category:preset.category,price};
        });
        // One database round trip keeps full-catalog setup within the transaction deadline.
        await tx.$executeRaw`INSERT INTO "LaundryService" ("id","businessId","name","category","price")
          SELECT p.id,${business.id},p.name,p.category,p.price
          FROM jsonb_to_recordset(${JSON.stringify(presets)}::jsonb) AS p(id text,name text,category text,price int)
          WHERE NOT EXISTS (SELECT 1 FROM "LaundryService" s WHERE s."businessId"=${business.id} AND s."name"=p.name AND s."category"=p.category AND s."active"=TRUE)`;
      } else if (data.type === "service") {
        id=data.requestId; const price=moneyToHalalas(data.price);
        await tx.$executeRaw`INSERT INTO "LaundryService" ("id","businessId","name","category","price") VALUES (${id},${business.id},${data.name},${data.category},${price}) ON CONFLICT ("id") DO NOTHING`;
      } else if (data.type === "urgent-price") {
        id=data.id;
        const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryAudit" WHERE "businessId"=${business.id} AND id=${data.requestId} AND action='urgent-price'`;
        if(replay.length)return {id};
        const rows=await tx.$queryRaw<Array<{price:number;name:string;category:string}>>`SELECT price,name,category FROM "LaundryService" WHERE "businessId"=${business.id} AND id=${data.id} AND active=TRUE`;
        const service=rows[0];if(!service)throw new LaundryInputError("الخدمة غير متاحة في منشأتك");
        // Reserved service-rate variants keep canonical service IDs stable for package eligibility.
        const variantId=`urgent:${data.id}`;
        if(!data.price.trim())await tx.$executeRaw`UPDATE "LaundryService" SET active=FALSE WHERE "businessId"=${business.id} AND id=${variantId}`;
        else {
          const price=moneyToHalalas(data.price);
          if(price<=service.price)throw new LaundryInputError("سعر المستعجل يجب أن يكون أعلى من السعر العادي");
          await tx.$executeRaw`INSERT INTO "LaundryService" (id,"businessId",name,category,price) VALUES (${variantId},${business.id},${`${service.name} — مستعجل`},${service.category},${price}) ON CONFLICT (id) DO UPDATE SET price=EXCLUDED.price,active=TRUE WHERE "LaundryService"."businessId"=EXCLUDED."businessId"`;
        }
      } else if (data.type === "archive") {
        id=data.id;
        const changed=await tx.$executeRaw`UPDATE "LaundryService" SET "active"=FALSE WHERE "businessId"=${business.id} AND "id"=${id}`;
        if (!changed) throw new LaundryInputError("الخدمة غير موجودة");
      } else if (data.type === "order") {
        const previous=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "requestId"=${data.requestId}`;
        if(previous[0]) return {id:previous[0].id};
        await assertInvoiceCapacity(tx,business.id);
        const dueAt=new Date(data.dueAt);
        if(dueAt.getTime()<Date.now()-60000 || dueAt.getTime()>Date.now()+366*86400000) throw new LaundryInputError("حدد موعد تسليم قادمًا خلال سنة");
        const catalog=await tx.$queryRaw<LaundryService[]>`SELECT s.*,u.price AS "urgentPrice" FROM "LaundryService" s LEFT JOIN "LaundryService" u ON u.id='urgent:'||s.id AND u."businessId"=s."businessId" AND u.active=TRUE WHERE s."businessId"=${business.id} AND s.active=TRUE AND s.id NOT LIKE 'urgent:%'`;
        const current=await tx.business.findFirst({where:{id:business.id,deletedAt:null},select:{pageModules:true,businessType:true,businessCategory:true}});
        if(!current)throw new LaundryInputError("المنشأة غير متاحة");
        const supportsUrgent=cashierUrgentEnabled(current.pageModules,current,hasClothingCatalogue(catalog));
        if(data.serviceSpeed==="urgent"&&!supportsUrgent)throw new LaundryInputError("خيار المستعجل غير مفعّل لهذا النشاط؛ حدّث الصفحة وراجع الطلب");
        let lines=laundryPricedLines(data.items,catalog,data.serviceSpeed);const paid=moneyToHalalas(data.paid);
        if((data.serviceSpeed==="urgent"&&!data.priceToken)||(data.priceToken!==undefined&&data.priceToken!==laundryPriceToken(lines)))throw new LaundryInputError("تغيرت أسعار الطلب؛ حدّث الصفحة وراجع أسعار المنيو قبل الحفظ");
        let total=lines.reduce((s,x)=>s+x.total,0);
        const allocations=collectionAllocations(data.paid,data.method,data.cashPaid);
        if(paid>total) throw new LaundryInputError("الدفعة أكبر من إجمالي الطلب");
        const rows=await tx.$queryRaw<Array<{number:number}>>`SELECT COALESCE(MAX("number"),0)+1 AS "number" FROM "LaundryTicket" WHERE "businessId"=${business.id}`;
        id=randomUUID();
        const customer=await ensureLaundryCustomer(tx,business.id,data.customerName,data.phone);
        let quote:ReturnType<typeof quoteSubscriberOrder>|null=null;
        if(data.useSubscription){
          const balances=await tx.$queryRaw<Array<Omit<SubscriberBalance,"startsAt"|"expiresAt">&{startsAt:Date;expiresAt:Date}>>`SELECT id,name,remaining,kind,"unitsIncluded","unitsRemaining","startsAt","expiresAt","serviceIds" FROM "LaundryPrepaid" WHERE "businessId"=${business.id} AND "customerId"=${customer.id} AND remaining>0 AND "startsAt"<=now() AND "expiresAt">now() ORDER BY "expiresAt",id LIMIT 100 FOR UPDATE`;
          quote=quoteSubscriberOrder(balances.map(s=>({...s,startsAt:s.startsAt.toISOString(),expiresAt:s.expiresAt.toISOString()})),lines,paid);
          if(data.subscriptionCovered!==quote.covered||(data.subscriptionToken!==undefined&&data.subscriptionToken!==quote.token)||(quote.allocations.some(a=>a.units>0)&&data.subscriptionToken===undefined))throw new LaundryInputError("تغير رصيد الاشتراك أو تفاصيل الباقة. أعد قراءة الرصيد قبل حفظ الطلب");
          lines=quote.lines;total=quote.total;
        }
        await tx.$executeRaw`INSERT INTO "LaundryTicket" ("id","businessId","number","requestId","customerName","phone","customerId","items","total","paid","dueAt","notes","createdBy") VALUES (${id},${business.id},${rows[0].number},${data.requestId},${data.customerName},${customer.phone},${customer.id},${JSON.stringify(supportsUrgent?withLaundryServiceSpeed(lines,data.serviceSpeed):lines)}::jsonb,${total},${paid},${dueAt},${data.notes},${user.id})`;
        await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id,kind:"order",amount:total,at:new Date(),description:`استلام طلب #${rows[0].number}`});
        if(quote){
          for(const allocation of quote.allocations){
            const paymentId=randomUUID(),movementId=randomUUID(),requestId=`${data.requestId}:subscription:${allocation.id}`;
            await tx.$executeRaw`UPDATE "LaundryPrepaid" SET remaining=remaining-${allocation.amount},"unitsRemaining"="unitsRemaining"-${allocation.units} WHERE "businessId"=${business.id} AND id=${allocation.id}`;
            await tx.$executeRaw`INSERT INTO "LaundryPayment" (id,"businessId","ticketId","requestId",amount,method,"createdBy") VALUES (${paymentId},${business.id},${id},${requestId},${allocation.amount},'prepaid',${user.id})`;
            await tx.$executeRaw`INSERT INTO "LaundryPrepaidMovement" (id,"businessId","prepaidId","requestId",kind,amount,method,"paymentId",reason,units,"createdBy") VALUES (${movementId},${business.id},${allocation.id},${requestId},'redeem',${allocation.amount},'prepaid',${paymentId},${`سداد تلقائي للطلب #${rows[0].number}: ${allocation.name}`},${allocation.units},${user.id})`;
            await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id:paymentId,kind:"payment",amount:allocation.amount,method:"prepaid",at:new Date(),description:`سداد من اشتراك: ${allocation.name}`});
          }
          if(quote.covered)await tx.$executeRaw`UPDATE "LaundryTicket" SET paid=paid+${quote.covered} WHERE "businessId"=${business.id} AND id=${id}`;
        }
        if(data.readyNotifyConsent)await tx.$executeRaw`UPDATE "LaundryTicket" SET "readyNotifyConsentAt"=now() WHERE id=${id} AND "businessId"=${business.id}`;
        for(const [index,allocation] of allocations.entries()) {const paymentId=randomUUID();const paymentRequest=index===0?data.requestId:`${data.requestId}:${index}`;
          await tx.$executeRaw`INSERT INTO "LaundryPayment" ("id","businessId","ticketId","requestId","amount","method","createdBy") VALUES (${paymentId},${business.id},${id},${paymentRequest},${allocation.amount},${allocation.method},${user.id})`;
          await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id:paymentId,kind:"payment",amount:allocation.amount,method:allocation.method,at:new Date(),description:`تحصيل طلب #${rows[0].number}`});
        }
      } else if(data.type==="expense") {
        id=data.requestId; const amount=moneyToHalalas(data.amount);
        if(amount<=0) throw new LaundryInputError("أدخل مبلغًا أكبر من صفر");
        const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryExpense" WHERE "businessId"=${business.id} AND "requestId"=${data.requestId}`;
        if(existing[0])return {id:existing[0].id};
        await tx.$executeRaw`INSERT INTO "LaundryExpense" ("id","businessId","requestId","description","amount","method","createdBy") VALUES (${id},${business.id},${data.requestId},${data.description},${amount},${data.method},${user.id})`;
        await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id,kind:"expense",amount,method:data.method,at:new Date(),description:data.description});
      } else {
        id=data.id;
        const rows=await tx.$queryRaw<LaundryTicket[]>`SELECT * FROM "LaundryTicket" WHERE "id"=${id} AND "businessId"=${business.id} FOR UPDATE`;
        const ticket=rows[0]; if(!ticket) throw new LaundryInputError("الطلب غير موجود في منشأتك");
        if(data.type==="payment") {
          const old=await tx.$queryRaw<Array<{ticketId:string}>>`SELECT "ticketId" FROM "LaundryPayment" WHERE "businessId"=${business.id} AND "requestId"=${data.requestId}`;
          if(old[0]) {if(old[0].ticketId!==id) throw new LaundryInputError("معرّف الدفعة مستخدم");return {id};}
          const amount=moneyToHalalas(data.amount);
          if(amount<=0 || amount>ticket.total-ticket.paid) throw new LaundryInputError("الدفعة يجب ألا تتجاوز المبلغ المتبقي");
          const allocations=collectionAllocations(data.amount,data.method,data.cashPaid);
          for(const [index,allocation] of allocations.entries()){const paymentId=randomUUID();const paymentRequest=index===0?data.requestId:`${data.requestId}:${index}`;
            await tx.$executeRaw`INSERT INTO "LaundryPayment" ("id","businessId","ticketId","requestId","amount","method","createdBy") VALUES (${paymentId},${business.id},${id},${paymentRequest},${allocation.amount},${allocation.method},${user.id})`;
            await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id:paymentId,kind:"payment",amount:allocation.amount,method:allocation.method,at:new Date(),description:`تحصيل طلب #${ticket.number}`});
          }
          await tx.$executeRaw`UPDATE "LaundryTicket" SET "paid"="paid"+${amount},"updatedAt"=now() WHERE "id"=${id} AND "businessId"=${business.id}`;
        } else {
          if(ticket.status===data.status)return {id};
          if(data.status==="delivered"){const delivery=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryDelivery" WHERE "businessId"=${business.id} AND "ticketId"=${id}`;if(delivery.length)throw new LaundryInputError("هذا الطلب مسند للتوصيل؛ وثّق تسليمه من مساحة التوصيل");}
          if(!nextLaundryStatus(ticket.status,data.status,ticket.total-ticket.paid)) throw new LaundryInputError("اتبع مراحل الطلب بالترتيب، وسدّد المتبقي قبل التسليم");
          await tx.$executeRaw`UPDATE "LaundryTicket" SET "status"=${data.status},"updatedAt"=now() WHERE "id"=${id} AND "businessId"=${business.id}`;
          if(data.status==="ready")await enqueueLaundryReady(tx,business.id,id);
          if(data.status==="delivered")await postLaundrySource(tx,{businessId:business.id,actorId:user.id,id,kind:"delivery",amount:ticket.total,at:new Date(),description:`إيراد تسليم طلب #${ticket.number}`});
        }
      }
      await tx.$executeRaw`INSERT INTO "LaundryAudit" ("id","businessId","actorId","action","targetId") VALUES (${(data.type==="catalog"||data.type==="product"||data.type==="urgent-price"||data.type==="urgent-settings")?data.requestId:randomUUID()},${business.id},${user.id},${data.type},${id})`;
      return {id};
    },{timeout:15000});
    revalidatePath("/Laundromat");revalidatePath("/Accounting");
    return {ok:true,id:result.id};
  } catch(error) {
    return {ok:false,error:error instanceof LaundryInputError || error instanceof CommercialLimitError?error.message:"تعذر حفظ العملية. أعد المحاولة؛ لن تتكرر الدفعة أو الطلب."};
  }
}
