"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError, moneyToHalalas, type LaundryTicket } from "../lib/laundry-domain";
import { invoiceBalance, quoteInvoiceReturn, commissionReturnDelta, type ReturnLine } from "../lib/cashier-return";
import { postLaundryJournal } from "../lib/laundry-ledger";
import { endOrderLiveSessions } from "../lib/live-view/order-link";

type Tx=Prisma.TransactionClient;
type Ticket=LaundryTicket & {returned:number;refunded:number};
type Payment={id:string;amount:number;method:string;available:number;prepaidId:string|null;units:number;kind:string|null};
export type ReturnDocument={id:string;number:number;reason:string;items:ReturnLine[];amount:number;createdAt:string};
export type ReturnView={ticket:Pick<Ticket,"id"|"number"|"customerName"|"phone"|"items"|"total"|"paid"|"returned"|"refunded">;returns:ReturnDocument[];payments:Payment[];refunds:Array<{id:string;amount:number;method:string;reference:string;createdAt:string}>};
async function paymentsFor(tx:Tx,businessId:string,ticketId:string){
 return tx.$queryRaw<Payment[]>`SELECT p.id,p.amount,p.method,(p.amount-COALESCE((SELECT SUM(r.amount) FROM "CashierRefund" r WHERE r."businessId"=p."businessId" AND r."paymentId"=p.id),0))::int AS available,m."prepaidId",COALESCE(m.units,0)::int AS units,s.kind FROM "LaundryPayment" p LEFT JOIN "LaundryPrepaidMovement" m ON m."businessId"=p."businessId" AND m."paymentId"=p.id AND m.kind='redeem' LEFT JOIN "LaundryPrepaid" s ON s."businessId"=m."businessId" AND s.id=m."prepaidId" WHERE p."businessId"=${businessId} AND p."ticketId"=${ticketId} ORDER BY p."createdAt",p.id`;
}
export async function getInvoiceReturns(value:unknown):Promise<{ok:true;view:ReturnView}|{ok:false;error:string}>{
 const p=z.object({businessId:z.string().uuid(),ticketId:z.string().uuid().optional(),number:z.coerce.number().int().positive().optional()}).safeParse(value);
 if(!p.success||(!p.data.ticketId&&!p.data.number))return {ok:false,error:"حدد رقم الفاتورة"};
 const user=await getCurrentUser(),b=user&&await getActiveBusinessForUser(user.id,"laundryAccounting");
 if(!b||b.id!==p.data.businessId)return {ok:false,error:"المرتجعات تتطلب صلاحية محاسبة المنشأة النشطة"};
 try {
 const view=await db.$transaction(async tx=>{
 const rows=await tx.$queryRaw<Ticket[]>`SELECT id,number,"customerName",phone,items,total,paid,returned,refunded FROM "LaundryTicket" WHERE "businessId"=${b.id} AND ((${p.data.ticketId??""}<>'' AND id=${p.data.ticketId??""}) OR (${p.data.ticketId??""}='' AND number=${p.data.number??0}))`;
 const ticket=rows[0];if(!ticket)throw new LaundryInputError("الفاتورة غير موجودة في منشأتك");
 const returns=await tx.$queryRaw<Array<Omit<ReturnDocument,"createdAt">&{createdAt:Date}>>`SELECT id,number,reason,items,amount,"createdAt" FROM "CashierReturn" WHERE "businessId"=${b.id} AND "ticketId"=${ticket.id} ORDER BY "createdAt",id`;
 const refunds=await tx.$queryRaw<Array<{id:string;amount:number;method:string;reference:string;createdAt:Date}>>`SELECT id,amount,method,reference,"createdAt" FROM "CashierRefund" WHERE "businessId"=${b.id} AND "ticketId"=${ticket.id} ORDER BY "createdAt",id`;
 return {ticket,returns:returns.map(r=>({...r,createdAt:r.createdAt.toISOString()})),refunds:refunds.map(r=>({...r,createdAt:r.createdAt.toISOString()})),payments:await paymentsFor(tx,b.id,ticket.id)};
 },{isolationLevel:"RepeatableRead",timeout:15000});
 return {ok:true,view};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر قراءة المرتجعات"};}
}
async function settle(tx:Tx,businessId:string,actorId:string,ticket:Ticket,payment:Payment,amount:number,requestId:string,reference:string){
 if(amount<=0||amount>payment.available||amount>invoiceBalance(ticket).refundDue)throw new LaundryInputError("المبلغ يتجاوز المستحق للإعادة أو الدفعة الأصلية");
 let units=0;
 if(payment.method==="prepaid"){
  if(!payment.prepaidId)throw new LaundryInputError("مصدر رصيد الاشتراك غير معروف؛ يلزم مراجعة السجل");
  if(payment.units){if(amount!==payment.amount||payment.available!==payment.amount)throw new LaundryInputError("وحدات هذه الباقة تتطلب استعادة كامل دفعتها الأصلية");units=payment.units;}
  const changed=await tx.$executeRaw`UPDATE "LaundryPrepaid" SET remaining=remaining+${amount},"unitsRemaining"=CASE WHEN kind='credit' THEN "unitsRemaining" ELSE "unitsRemaining"+${units} END WHERE "businessId"=${businessId} AND id=${payment.prepaidId} AND remaining+${amount}<=amount AND (kind='credit' OR "unitsRemaining"+${units}<= "unitsIncluded")`;
  if(changed!==1)throw new LaundryInputError("تعذر استعادة رصيد الباقة؛ راجع حركات الاشتراك");
 }
 const id=randomUUID();
 await tx.$executeRaw`INSERT INTO "CashierRefund" (id,"businessId","ticketId","paymentId","requestId",amount,method,reference,"prepaidId",units,"createdBy") VALUES (${id},${businessId},${ticket.id},${payment.id},${requestId},${amount},${payment.method},${reference},${payment.prepaidId},${units},${actorId})`;
 await tx.$executeRaw`UPDATE "LaundryTicket" SET refunded=refunded+${amount} WHERE "businessId"=${businessId} AND id=${ticket.id}`;
 ticket.refunded+=amount;
 const account=payment.method==="prepaid"?"2100":payment.method==="cash"?"1100":payment.method==="card"?"1110":"1120";
 await postLaundryJournal(tx,{businessId,actorId,sourceKey:`invoice-refund:${id}`,description:`إعادة مبلغ فاتورة #${ticket.number}: ${reference}`,effectiveAt:new Date(),lines:[{accountCode:"1200",debit:amount,credit:0},{accountCode:account,debit:0,credit:amount}]});
 await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${businessId},${actorId},'invoice-refund',${id})`;
}
const input=z.discriminatedUnion("type",[
 z.object({type:z.literal("return"),businessId:z.string().uuid(),ticketId:z.string().uuid(),requestId:z.string().uuid(),reason:z.string().trim().min(4).max(300),items:z.array(z.object({index:z.number().int().min(0),quantity:z.number().min(0.01).max(10000)})).min(1).max(240)}),
 z.object({type:z.literal("refund"),businessId:z.string().uuid(),ticketId:z.string().uuid(),requestId:z.string().uuid(),paymentId:z.string().uuid(),amount:z.string(),reference:z.string().trim().min(4).max(300),confirmed:z.literal(true)})
]);
export async function invoiceReturnCommand(value:unknown){
 const parsed=input.safeParse(value);if(!parsed.success)return {ok:false,error:"راجع بيانات المرتجع وتأكيد إعادة المبلغ"};
 const d=parsed.data,user=await getCurrentUserForApiWrite(),b=user&&await getActiveBusinessForUser(user.id,"laundryAccounting");
 if(!user||!b||b.id!==d.businessId)return {ok:false,error:"المرتجعات تتطلب صلاحية محاسبة المنشأة النشطة"};
 try{
 await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const existing=d.type==="return"?await tx.$queryRaw<Array<{ticketId:string}>>`SELECT "ticketId" FROM "CashierReturn" WHERE "businessId"=${b.id} AND "requestId"=${d.requestId}`:await tx.$queryRaw<Array<{ticketId:string}>>`SELECT "ticketId" FROM "CashierRefund" WHERE "businessId"=${b.id} AND "requestId"=${d.requestId}`;
 if(existing[0]){if(existing[0].ticketId!==d.ticketId)throw new LaundryInputError("معرف العملية مستخدم لفاتورة أخرى");return;}
 const books=await tx.$queryRaw<Array<{initializedAt:Date|null}>>`SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId"=${b.id}`;
 if(!books[0]?.initializedAt)throw new LaundryInputError("أكمل تهيئة دفتر المحاسبة أولًا لتسجيل أثر المرتجع");
 const tickets=await tx.$queryRaw<Ticket[]>`SELECT * FROM "LaundryTicket" WHERE "businessId"=${b.id} AND id=${d.ticketId} FOR UPDATE`;
 const ticket=tickets[0];if(!ticket)throw new LaundryInputError("الفاتورة غير موجودة في منشأتك");
 const payments=await paymentsFor(tx,b.id,ticket.id);
 if(d.type==="refund"){
  const payment=payments.find(p=>p.id===d.paymentId);if(!payment||payment.method==="prepaid")throw new LaundryInputError("اختر دفعة نقدية أو شبكة أو تحويل من هذه الفاتورة");
  await settle(tx,b.id,user.id,ticket,payment,moneyToHalalas(d.amount),d.requestId,d.reference);
 }else{
  const previous=await tx.$queryRaw<Array<{items:ReturnLine[]}>>`SELECT items FROM "CashierReturn" WHERE "businessId"=${b.id} AND "ticketId"=${ticket.id}`;
  const quote=quoteInvoiceReturn(ticket.items,previous.flatMap(r=>r.items),d.items),next=ticket.returned+quote.amount;
  if(next>ticket.total)throw new LaundryInputError("قيمة المرتجع تتجاوز المتبقي");
  if(payments.some(p=>p.units>0)&&next!==ticket.total)throw new LaundryInputError("هذه الفاتورة استخدمت باقة قطع أو زيارات؛ أرجع الفاتورة بالكامل لاستعادة وحداتها بدقة");
  const commissions=await tx.$queryRaw<Array<{amount:number}>>`SELECT amount FROM "CashierCommission" WHERE "businessId"=${b.id} AND "ticketId"=${ticket.id}`;
  const reversed=commissions[0]?commissionReturnDelta(commissions[0].amount,ticket.total,ticket.returned,next):0;
  const numbers=await tx.$queryRaw<Array<{n:number}>>`SELECT COALESCE(MAX(number),0)+1 AS n FROM "CashierReturn" WHERE "businessId"=${b.id}`;
  const id=randomUUID();
  await tx.$executeRaw`INSERT INTO "CashierReturn" (id,"businessId","ticketId","requestId",number,reason,items,amount,"commissionReversed","createdBy") VALUES (${id},${b.id},${ticket.id},${d.requestId},${numbers[0].n},${d.reason},${JSON.stringify(quote.lines)}::jsonb,${quote.amount},${reversed},${user.id})`;
  await tx.$executeRaw`UPDATE "LaundryTicket" SET returned=${next} WHERE "businessId"=${b.id} AND id=${ticket.id}`;
  ticket.returned=next;
  await postLaundryJournal(tx,{businessId:b.id,actorId:user.id,sourceKey:`invoice-return:${id}`,description:`مرتجع #${numbers[0].n} للفاتورة #${ticket.number}: ${d.reason}`,effectiveAt:new Date(),lines:[{accountCode:ticket.status==="delivered"?"4000":"2200",debit:quote.amount,credit:0},{accountCode:"1200",debit:0,credit:quote.amount}]});
  for(const payment of payments.filter(p=>p.method==="prepaid"&&p.available>0)){
   const amount=Math.min(payment.available,invoiceBalance(ticket).refundDue);if(!amount)break;
   await settle(tx,b.id,user.id,ticket,payment,amount,`${d.requestId}:${payment.id}`,`استعادة رصيد اشتراك من المرتجع #${numbers[0].n}`);
  }
  if(next===ticket.total)await endOrderLiveSessions(tx,b.id,ticket.id,user.id);
  await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${b.id},${user.id},'invoice-return',${id})`;
 }
 },{timeout:30000});
 revalidatePath("/Accounting");revalidatePath("/Laundromat");return {ok:true};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ العملية. أعد المحاولة دون تغيير بياناتها لتجنب التكرار"};}
}
