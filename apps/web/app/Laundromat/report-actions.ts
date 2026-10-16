"use server";
import { z } from "zod";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { laundryReportRange, type LaundryReport } from "../lib/laundry-report";
export async function getLaundryReport(value:unknown):Promise<{ok:true;report:LaundryReport}|{ok:false;error:string}>{
 const parsed=z.object({businessId:z.string().uuid(),from:z.string().max(10),to:z.string().max(10)}).safeParse(value);
 if(!parsed.success)return {ok:false,error:"راجع المنشأة وتواريخ التقرير"};
 const input=parsed.data;
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يرجى تسجيل الدخول"};
 const business=await getActiveBusinessForUser(user.id,"laundry");
 if(!business||business.ownerId!==user.id||business.id!==input.businessId)return {ok:false,error:"التقرير متاح لمالك المنشأة النشطة فقط"};
 let range;try{range=laundryReportRange(input.from,input.to);}catch(error){return {ok:false,error:error instanceof Error?error.message:"فترة غير صالحة"};}
 const {start,end}=range;
 try{
 const report=await db.$transaction(async tx=>{
 const [tickets,payments,expenses,movements]=await Promise.all([
 tx.$queryRaw<Array<{invoiced:number;orders:number;before:number;through:number}>>`SELECT COALESCE(SUM("total") FILTER(WHERE "createdAt">=${start}),0)::float8 AS invoiced,COUNT(*) FILTER(WHERE "createdAt">=${start})::int AS orders,COALESCE(SUM("total") FILTER(WHERE "createdAt"<${start}),0)::float8 AS before,COALESCE(SUM("total"),0)::float8 AS through FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "createdAt"<${end}`,
 tx.$queryRaw<Array<{cash:number;card:number;transfer:number;before:number;through:number;count:number}>>`SELECT COALESCE(SUM("amount") FILTER(WHERE "createdAt">=${start} AND "method"='cash'),0)::float8 AS cash,COALESCE(SUM("amount") FILTER(WHERE "createdAt">=${start} AND "method"='card'),0)::float8 AS card,COALESCE(SUM("amount") FILTER(WHERE "createdAt">=${start} AND "method"='transfer'),0)::float8 AS transfer,COALESCE(SUM("amount") FILTER(WHERE "createdAt"<${start}),0)::float8 AS before,COALESCE(SUM("amount"),0)::float8 AS through,COUNT(*) FILTER(WHERE "createdAt">=${start})::int AS count FROM "LaundryPayment" WHERE "businessId"=${business.id} AND "createdAt"<${end}`,
 tx.$queryRaw<Array<{amount:number;count:number}>>`SELECT COALESCE(SUM("amount"),0)::float8 AS amount,COUNT(*)::int AS count FROM "LaundryExpense" WHERE "businessId"=${business.id} AND "createdAt">=${start} AND "createdAt"<${end}`,
 tx.$queryRaw<Array<{id:string;kind:string;description:string;method:string;amount:number;createdAt:Date}>>`SELECT p."id",'payment' AS kind,('تحصيل طلب #'||t."number"::text) AS description,p."method",p."amount",p."createdAt" FROM "LaundryPayment" p JOIN "LaundryTicket" t ON t."businessId"=p."businessId" AND t."id"=p."ticketId" WHERE p."businessId"=${business.id} AND p."createdAt">=${start} AND p."createdAt"<${end} UNION ALL SELECT "id",'expense' AS kind,"description",'unspecified' AS method,"amount","createdAt" FROM "LaundryExpense" WHERE "businessId"=${business.id} AND "createdAt">=${start} AND "createdAt"<${end} ORDER BY "createdAt" DESC,"id" DESC LIMIT 500`,
 ]);
 const t=tickets[0],p=payments[0],e=expenses[0];
 return {from:input.from,to:input.to,invoiced:t.invoiced,orders:t.orders,cash:p.cash,card:p.card,transfer:p.transfer,expenses:e.amount,openingReceivables:t.before-p.before,closingReceivables:t.through-p.through,movementCount:p.count+e.count,movements:movements.map(x=>({...x,createdAt:x.createdAt.toISOString()}))};
 },{isolationLevel:"RepeatableRead",timeout:15000});
 return {ok:true,report};
 }catch{return {ok:false,error:"تعذر تحميل التقرير. حاول مرة أخرى."};}
}
