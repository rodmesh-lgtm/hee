"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError, moneyToHalalas } from "../lib/laundry-domain";
import { LAUNDRY_ACCOUNTS, type LedgerLine } from "../lib/laundry-ledger-domain";
import { postLaundryJournal, postLaundrySource } from "../lib/laundry-ledger";
import { laundryReportRange } from "../lib/laundry-report";
const commands=z.discriminatedUnion("type",[
 z.object({type:z.literal("initialize")}),
 z.object({type:z.literal("journal"),requestId:z.string().uuid(),date:z.string().max(10),description:z.string().trim().min(4).max(300),lines:z.array(z.object({accountCode:z.string().regex(/^\d{4,8}$/),debit:z.string(),credit:z.string()})).min(2).max(100)}),
 z.object({type:z.literal("reverse"),id:z.string().uuid(),reason:z.string().trim().min(4).max(200)}),
 z.object({type:z.literal("lock"),date:z.string().max(10)}),
 z.object({type:z.literal("account"),code:z.string().regex(/^\d{4,8}$/),name:z.string().trim().min(2).max(100),kind:z.enum(["asset","liability","equity","income","expense"])}),
]);
export async function laundryLedgerCommand(value:unknown):Promise<{ok:boolean;error?:string;more?:boolean;processed?:number}>{
 const scope=z.object({businessId:z.string().uuid()}).safeParse(value),parsed=commands.safeParse(value);
 if(!scope.success||!parsed.success)return {ok:false,error:"راجع بيانات العملية المحاسبية"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثّق"};
 const business=await getActiveBusinessForUser(user.id,"laundryAccounting");
 if(!business||business.id!==scope.data.businessId)return {ok:false,error:"دفتر الحسابات يتطلب صلاحية محاسبة المنشأة النشطة"};
 const data=parsed.data;
 try{
 const result=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${business.id}`}))`;
  const books=await tx.$queryRaw<Array<{initializedAt:Date|null;lockedBefore:Date|null}>>`SELECT "initializedAt","lockedBefore" FROM "LaundryBook" WHERE "businessId"=${business.id}`;
  if(data.type==="initialize"){
   if(books[0]?.initializedAt)return {more:false,processed:0};
   if(!books.length){
    const invalid=await tx.$queryRaw<Array<{id:string}>>`SELECT t."id" FROM "LaundryTicket" t WHERE t."businessId"=${business.id} AND t."paid"<>(SELECT COALESCE(SUM(p."amount"),0) FROM "LaundryPayment" p WHERE p."businessId"=t."businessId" AND p."ticketId"=t."id") LIMIT 1`;
    if(invalid.length)throw new LaundryInputError("يوجد اختلاف بين المدفوعات وإجمالي التحصيل في أحد الطلبات. يلزم مراجعة السجل قبل التهيئة.");
    await tx.$executeRaw`INSERT INTO "LaundryBook" ("businessId","createdBy") VALUES (${business.id},${user.id})`;
    await tx.$executeRaw`INSERT INTO "LaundryAccount" ("businessId","code","name","kind") SELECT ${business.id},a.code,a.name,a.kind FROM jsonb_to_recordset(${JSON.stringify(LAUNDRY_ACCOUNTS)}::jsonb) AS a(code text,name text,kind text)`;
   }
   // Resumable backfill, bounded per request. Source keys prevent duplicate postings.
   const pending=await tx.$queryRaw<Array<{id:string;kind:"order"|"payment"|"delivery"|"expense";amount:number;method:string;at:Date;description:string}>>`
    SELECT s.* FROM (
     SELECT "id",'order' AS kind,"total" AS amount,'' AS method,"createdAt" AS at,('استلام طلب #'||"number") AS description FROM "LaundryTicket" WHERE "businessId"=${business.id}
     UNION ALL SELECT "id",'delivery',"total",'',"updatedAt",('تسليم طلب #'||"number") FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "status"='delivered'
     UNION ALL SELECT "id",'payment',"amount","method","createdAt",'تحصيل طلب' FROM "LaundryPayment" WHERE "businessId"=${business.id}
     UNION ALL SELECT "id",'expense',"amount","method","createdAt","description" FROM "LaundryExpense" WHERE "businessId"=${business.id}
    ) s WHERE s.amount>0 AND NOT EXISTS(SELECT 1 FROM "LaundryJournal" j WHERE j."businessId"=${business.id} AND j."sourceKey"=s.kind||':'||s.id) ORDER BY s.at,s.kind,s.id LIMIT 25`;
   for(const source of pending)await postLaundrySource(tx,{...source,businessId:business.id,actorId:user.id});
   const more=pending.length===25;
   if(!more)await tx.$executeRaw`UPDATE "LaundryBook" SET "initializedAt"=now() WHERE "businessId"=${business.id}`;
   await tx.$executeRaw`INSERT INTO "LaundryAudit" ("id","businessId","actorId","action","targetId") VALUES (${randomUUID()},${business.id},${user.id},'ledger-initialize',${business.id})`;
   return {more,processed:pending.length};
  }
  if(!books[0]?.initializedAt)throw new LaundryInputError("أكمل تهيئة الدفتر أولًا");
  let target=business.id;
  if(data.type==="journal"){
   const {start}=laundryReportRange(data.date,data.date);
   if(start>new Date())throw new LaundryInputError("لا تسجّل قيدًا بتاريخ مستقبلي");
   const lines:LedgerLine[]=data.lines.map(l=>({accountCode:l.accountCode,debit:moneyToHalalas(l.debit.trim()||"0"),credit:moneyToHalalas(l.credit.trim()||"0")}));
   target=(await postLaundryJournal(tx,{businessId:business.id,actorId:user.id,sourceKey:`manual:${data.requestId}`,effectiveAt:start,description:data.description,lines}))!;
  }else if(data.type==="reverse"){
   const rows=await tx.$queryRaw<Array<{id:string;sourceKey:string;number:number}>>`SELECT "id","sourceKey","number" FROM "LaundryJournal" WHERE "id"=${data.id} AND "businessId"=${business.id}`;
   if(!rows[0]?.sourceKey.startsWith("manual:"))throw new LaundryInputError("العكس هنا للقيود اليدوية فقط؛ القيود الآلية تُصحّح من مصدرها");
   const lines=await tx.$queryRaw<LedgerLine[]>`SELECT "accountCode","credit"::float8 AS debit,"debit"::float8 AS credit FROM "LaundryJournalLine" WHERE "businessId"=${business.id} AND "journalId"=${data.id}`;
   target=(await postLaundryJournal(tx,{businessId:business.id,actorId:user.id,sourceKey:`reversal:${data.id}`,effectiveAt:new Date(),description:`عكس القيد #${rows[0].number}: ${data.reason}`,reversalOf:data.id,lines}))!;
  }else if(data.type==="account"){
   const old=await tx.$queryRaw<Array<{code:string}>>`SELECT "code" FROM "LaundryAccount" WHERE "businessId"=${business.id} AND "code"=${data.code}`;
   if(old.length)throw new LaundryInputError("رمز الحساب مستخدم بالفعل");
   await tx.$executeRaw`INSERT INTO "LaundryAccount" ("businessId","code","name","kind") VALUES (${business.id},${data.code},${data.name},${data.kind})`;
   target=data.code;
  }else{
   const {end}=laundryReportRange(data.date,data.date);
   const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
   if(end>laundryReportRange(today,today).start)throw new LaundryInputError("يمكن إقفال الأيام السابقة فقط، لتبقى عمليات اليوم متاحة");
   if(books[0].lockedBefore&&end<=books[0].lockedBefore)throw new LaundryInputError("هذه الفترة مقفلة بالفعل");
   await tx.$executeRaw`UPDATE "LaundryBook" SET "lockedBefore"=${end} WHERE "businessId"=${business.id}`;
  }
  await tx.$executeRaw`INSERT INTO "LaundryAudit" ("id","businessId","actorId","action","targetId") VALUES (${randomUUID()},${business.id},${user.id},${`ledger-${data.type}`},${target})`;
  return {};
 },{timeout:30000});
 revalidatePath("/Laundromat");return {ok:true,...result};
 }catch(error){return {ok:false,error:error instanceof LaundryInputError?error.message:"تعذر حفظ العملية المحاسبية. أعد المحاولة دون تغيير البيانات."};}
}
export type LaundryLedgerView={initialized:boolean;exists:boolean;lockedBefore:string|null;accounts:Array<{code:string;name:string;kind:string;opening:number;debit:number;credit:number;balance:number}>;journals:Array<{id:string;number:number;sourceKey:string;description:string;effectiveAt:string;total:number;reversed:boolean}>;journalCount:number;page:number};
export async function getLaundryLedger(value:unknown):Promise<{ok:true;view:LaundryLedgerView}|{ok:false;error:string}>{
 const p=z.object({businessId:z.string().uuid(),from:z.string().max(10),to:z.string().max(10),page:z.number().int().min(0).max(100000).default(0)}).safeParse(value);if(!p.success)return {ok:false,error:"راجع تواريخ الدفتر"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const business=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!business||business.id!==p.data.businessId)return {ok:false,error:"دفتر الحسابات يتطلب صلاحية محاسبة المنشأة النشطة"};
 try{
 const {start,end}=laundryReportRange(p.data.from,p.data.to);
 const view=await db.$transaction(async tx=>{
 const [books,accounts,journals,counts]=await Promise.all([
 tx.$queryRaw<Array<{initializedAt:Date|null;lockedBefore:Date|null}>>`SELECT "initializedAt","lockedBefore" FROM "LaundryBook" WHERE "businessId"=${business.id}`,
 tx.$queryRaw<LaundryLedgerView["accounts"]>`SELECT a.code,a.name,a.kind,COALESCE(SUM(l.debit-l.credit) FILTER(WHERE j."effectiveAt"<${start}),0)::float8 AS opening,COALESCE(SUM(l.debit) FILTER(WHERE j."effectiveAt">=${start}),0)::float8 AS debit,COALESCE(SUM(l.credit) FILTER(WHERE j."effectiveAt">=${start}),0)::float8 AS credit,COALESCE(SUM(l.debit-l.credit),0)::float8 AS balance FROM "LaundryAccount" a LEFT JOIN ("LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" AND j."effectiveAt"<${end}) ON l."businessId"=a."businessId" AND l."accountCode"=a.code WHERE a."businessId"=${business.id} GROUP BY a.code,a.name,a.kind ORDER BY a.code`,
 tx.$queryRaw<Array<{id:string;number:number;sourceKey:string;description:string;effectiveAt:Date;total:number;reversed:boolean}>>`SELECT j.id,j.number,j."sourceKey",j.description,j."effectiveAt",SUM(l.debit)::float8 AS total,EXISTS(SELECT 1 FROM "LaundryJournal" r WHERE r."businessId"=j."businessId" AND r."reversalOf"=j.id) AS reversed FROM "LaundryJournal" j JOIN "LaundryJournalLine" l ON l."businessId"=j."businessId" AND l."journalId"=j.id WHERE j."businessId"=${business.id} AND j."effectiveAt">=${start} AND j."effectiveAt"<${end} GROUP BY j.id ORDER BY j."effectiveAt" DESC,j.number DESC LIMIT 100 OFFSET ${p.data.page*100}`,
 tx.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryJournal" WHERE "businessId"=${business.id} AND "effectiveAt">=${start} AND "effectiveAt"<${end}`,
 ]);
 return {exists:books.length>0,initialized:!!books[0]?.initializedAt,lockedBefore:books[0]?.lockedBefore?.toISOString()??null,accounts,journals:journals.map(j=>({...j,effectiveAt:j.effectiveAt.toISOString()})),journalCount:counts[0].n,page:p.data.page};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,view};
 }catch{return {ok:false,error:"تعذر قراءة دفتر الحسابات"};}
}
export type LedgerDetailLine={id:string;number:number;description:string;effectiveAt:string;accountCode:string;name:string;debit:number;credit:number;runningBalance:number};
export async function getLaundryLedgerDetails(value:unknown):Promise<{ok:true;lines:LedgerDetailLine[];totalCount:number;opening:number;page:number}|{ok:false;error:string}>{
 const p=z.object({businessId:z.string().uuid(),id:z.string().uuid().optional(),accountCode:z.string().regex(/^\d{4,8}$/).optional(),from:z.string().max(10),to:z.string().max(10),page:z.number().int().min(0).max(100000).default(0)}).safeParse(value);
 if(!p.success||(Boolean(p.data.id)===Boolean(p.data.accountCode)))return {ok:false,error:"حدد القيد أو الحساب"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const b=await getActiveBusinessForUser(user.id,"laundryAccounting");if(!b||b.id!==p.data.businessId)return {ok:false,error:"تفاصيل الدفتر تتطلب صلاحية محاسبة المنشأة النشطة"};
 try{const {start,end}=laundryReportRange(p.data.from,p.data.to);const id=p.data.id??"",account=p.data.accountCode??"";
 const result=await db.$transaction(async tx=>{
 const [openingRows,counts]=await Promise.all([
 tx.$queryRaw<Array<{amount:number}>>`SELECT COALESCE(SUM(l.debit-l.credit),0)::float8 AS amount FROM "LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" WHERE l."businessId"=${b.id} AND l."accountCode"=${account} AND j."effectiveAt"<${start}`,
 tx.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" WHERE l."businessId"=${b.id} AND (${id}='' OR j.id=${id}) AND (${account}='' OR l."accountCode"=${account}) AND j."effectiveAt">=${start} AND j."effectiveAt"<${end}`
 ]);
 const opening=openingRows[0].amount;
 const lines=await tx.$queryRaw<Array<Omit<LedgerDetailLine,"effectiveAt">&{effectiveAt:Date}>>`SELECT l.id,j.number,j.description,j."effectiveAt",l."accountCode",a.name,l.debit::float8,l.credit::float8,(${opening}::numeric+SUM(l.debit-l.credit) OVER(ORDER BY j."effectiveAt",j.number,l.id ROWS UNBOUNDED PRECEDING))::float8 AS "runningBalance" FROM "LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" JOIN "LaundryAccount" a ON a."businessId"=l."businessId" AND a.code=l."accountCode" WHERE l."businessId"=${b.id} AND (${id}='' OR j.id=${id}) AND (${account}='' OR l."accountCode"=${account}) AND j."effectiveAt">=${start} AND j."effectiveAt"<${end} ORDER BY j."effectiveAt",j.number,l.id LIMIT 200 OFFSET ${p.data.page*200}`;
 return {lines:lines.map(l=>({...l,effectiveAt:l.effectiveAt.toISOString()})),totalCount:counts[0].n,opening,page:p.data.page};
 },{isolationLevel:"RepeatableRead",timeout:15000});
 return {ok:true,...result};
 }catch{return {ok:false,error:"تعذر قراءة تفاصيل القيد أو الحساب"};}
}
