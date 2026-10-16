import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { LaundryInputError } from "./laundry-domain";
import { balancedLaundryLines, laundrySourceLines, type LedgerLine } from "./laundry-ledger-domain";
type Tx=Prisma.TransactionClient;
export async function postLaundryJournal(tx:Tx,input:{businessId:string;actorId:string;sourceKey:string;description:string;effectiveAt:Date;lines:LedgerLine[];reversalOf?:string}){
 const {businessId,sourceKey,effectiveAt}=input;
 const books=await tx.$queryRaw<Array<{lockedBefore:Date|null}>>`SELECT "lockedBefore" FROM "LaundryBook" WHERE "businessId"=${businessId}`;
 if(!books.length)return null;
 const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LaundryJournal" WHERE "businessId"=${businessId} AND "sourceKey"=${sourceKey}`;
 if(replay[0])return replay[0].id;
 if(books[0].lockedBefore&&effectiveAt<books[0].lockedBefore)throw new LaundryInputError("الفترة المحاسبية مغلقة. اختر تاريخًا في فترة مفتوحة.");
 balancedLaundryLines(input.lines);
 const accounts=await tx.$queryRaw<Array<{code:string}>>`SELECT "code" FROM "LaundryAccount" WHERE "businessId"=${businessId}`;
 if(input.lines.some(l=>!accounts.some(a=>a.code===l.accountCode)))throw new LaundryInputError("يوجد حساب غير تابع لدفتر المنشأة");
 const id=randomUUID();
 // Caller holds laundry:<businessId> advisory lock throughout the source transaction.
 await tx.$executeRaw`INSERT INTO "LaundryJournal" ("id","businessId","number","sourceKey","description","effectiveAt","createdBy","reversalOf") SELECT ${id},${businessId},COALESCE(MAX("number"),0)+1,${sourceKey},${input.description},${effectiveAt},${input.actorId},${input.reversalOf??null} FROM "LaundryJournal" WHERE "businessId"=${businessId}`;
 const lines=input.lines.map(l=>({...l,id:randomUUID()}));
 await tx.$executeRaw`INSERT INTO "LaundryJournalLine" ("id","businessId","journalId","accountCode","debit","credit") SELECT l.id,${businessId},${id},l."accountCode",l.debit,l.credit FROM jsonb_to_recordset(${JSON.stringify(lines)}::jsonb) AS l(id text,"accountCode" text,debit bigint,credit bigint)`;
 return id;
}
export async function postLaundrySource(tx:Tx,input:{businessId:string;actorId:string;id:string;kind:"order"|"payment"|"delivery"|"expense";amount:number;method?:string;at:Date;description:string}){
 if(!input.amount)return null;
 const times=input.kind==="payment"?await tx.$queryRaw<Array<{at:Date}>>`SELECT "createdAt" AS at FROM "LaundryPayment" WHERE "businessId"=${input.businessId} AND "id"=${input.id}`:input.kind==="expense"?await tx.$queryRaw<Array<{at:Date}>>`SELECT "createdAt" AS at FROM "LaundryExpense" WHERE "businessId"=${input.businessId} AND "id"=${input.id}`:await tx.$queryRaw<Array<{at:Date}>>`SELECT CASE WHEN ${input.kind}='delivery' THEN "updatedAt" ELSE "createdAt" END AS at FROM "LaundryTicket" WHERE "businessId"=${input.businessId} AND "id"=${input.id}`;
 if(!times[0])throw new LaundryInputError("مصدر القيد غير موجود في المنشأة");
 return postLaundryJournal(tx,{businessId:input.businessId,actorId:input.actorId,sourceKey:`${input.kind}:${input.id}`,description:input.description,effectiveAt:times[0].at,lines:laundrySourceLines(input.kind,input.amount,input.method)});
}
