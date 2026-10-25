import "server-only";
import type { Prisma,PrismaClient } from "@prisma/client";
import { db } from "./db";
import { commercialAccess } from "./commercial-access";
import { commercialMonth,commercialQuotaKey,incrementCommercialQuota } from "./commercial-quota-sql";
export class CommercialLimitError extends Error {constructor(){super("بلغت حد الاستخدام في باقتك. راجع الباقات؛ لا تُحتسب زيادة تلقائية.");}}
export async function reserveTemplateProcessing(businessId:string,jobId:string,database:PrismaClient=db,scope:"marketing"|"operational"="marketing"){
 return database.$transaction(async tx=>{
  const plan=await commercialAccess(businessId,tx);if(plan.monthlyTemplates===null)return;
  const split=plan.monthlyMarketingTemplates!==undefined;
  const limit=split?(scope==="marketing"?plan.monthlyMarketingTemplates!:plan.monthlyOperationalTemplates!):plan.monthlyTemplates;
  const metric=split?`templates:${scope}`:"templates";
  const {start,period}=commercialMonth(),key=commercialQuotaKey(businessId,metric,period),receipt=commercialQuotaKey(businessId,metric,period,jobId),now=new Date();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  const seen=await tx.$queryRaw<Array<{count:number}>>`SELECT count FROM "RequestRateLimit" WHERE key=${receipt}`;if(seen.length)return;
  if(limit<1||!(await tx.$queryRaw<Array<{count:number}>>(incrementCommercialQuota(key,1,limit,start,now))).length)throw new CommercialLimitError();
  await tx.$executeRaw`INSERT INTO "RequestRateLimit" (key,"windowStart",count,"updatedAt") VALUES (${receipt},${start},1,${now})`;
 });
}
export type LiveTransferReservation={key:string;amountKB:number}|null;
/** Reserve before contacting the relay so concurrent viewers cannot overdraw origin traffic. */
export async function reserveLiveTransfer(businessId:string):Promise<LiveTransferReservation>{
 const plan=await commercialAccess(businessId);if(!plan.liveView)throw new CommercialLimitError();if(plan.liveTransferKB===null)return null;
 const {start,period}=commercialMonth(),key=commercialQuotaKey(businessId,"live-kb",period),amountKB=Math.ceil(4_000_000/1024);
 if(amountKB>plan.liveTransferKB||!(await db.$queryRaw<Array<{count:number}>>(incrementCommercialQuota(key,amountKB,plan.liveTransferKB,start,new Date()))).length)throw new CommercialLimitError();
 return {key,amountKB};
}
export async function settleLiveTransfer(reservation:LiveTransferReservation,actualBytes:number){
 if(!reservation)return;
 const actualKB=Math.max(0,Math.ceil(actualBytes/1024));
 if(!Number.isSafeInteger(actualKB)||actualKB>reservation.amountKB)throw new Error("INVALID_LIVE_TRANSFER_SETTLEMENT");
 const refund=reservation.amountKB-actualKB;
 if(refund)await db.$executeRaw`UPDATE "RequestRateLimit" SET count=GREATEST(0,count-${refund}),"updatedAt"=CURRENT_TIMESTAMP WHERE key=${reservation.key}`;
}
export async function assertInvoiceCapacity(tx:Prisma.TransactionClient,businessId:string){
 const plan=await commercialAccess(businessId,tx);if(!plan.cashier)throw new CommercialLimitError();if(plan.monthlyInvoices===null)return;
 const {start,end}=commercialMonth();
 const rows=await tx.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryTicket" WHERE "businessId"=${businessId} AND "createdAt">=${start} AND "createdAt"<${end}`;
 if((rows[0]?.count??0)>=plan.monthlyInvoices)throw new CommercialLimitError();
}
export async function assertBookingCapacity(tx:Prisma.TransactionClient,businessId:string){
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commercial-bookings:${businessId}`}))`;
 const plan=await commercialAccess(businessId,tx);if(!plan.bookings)throw new CommercialLimitError();if(plan.monthlyBookings===null)return;
 const {start,end}=commercialMonth();
 if(await tx.booking.count({where:{businessId,createdAt:{gte:start,lt:end}}})>=plan.monthlyBookings)throw new CommercialLimitError();
}
export async function assertStaffCapacity(tx:Prisma.TransactionClient,businessId:string,excludeInviteEmail?:string,excludeMemberId?:string){
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commercial-seats:${businessId}`}))`;
 const plan=await commercialAccess(businessId,tx);if(plan.staffLimit===null)return;
 const [members,pending]=await Promise.all([
 tx.businessMember.count({where:{businessId,status:"active",...(excludeMemberId?{id:{not:excludeMemberId}}:{})}}),
 tx.oAuthState.count({where:{provider:"business-staff-invite",nonce:businessId,expiresAt:{gt:new Date()},...(excludeInviteEmail?{redirectTo:{not:excludeInviteEmail}}:{})}})
 ]);
 if(1+members+pending>=plan.staffLimit)throw new CommercialLimitError();
}
export async function commercialUsageSummary(businessId:string){
 const {start,end,period}=commercialMonth();
 const [invoices,bookings,staff,counters]=await Promise.all([
 db.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryTicket" WHERE "businessId"=${businessId} AND "createdAt">=${start} AND "createdAt"<${end}`,
 db.booking.count({where:{businessId,createdAt:{gte:start,lt:end}}}),db.businessMember.count({where:{businessId,status:"active"}}),
 db.$queryRaw<Array<{key:string;count:number}>>`SELECT key,count FROM "RequestRateLimit" WHERE key IN (${commercialQuotaKey(businessId,"templates",period)},${commercialQuotaKey(businessId,"live-kb",period)},${commercialQuotaKey(businessId,"templates:marketing",period)},${commercialQuotaKey(businessId,"templates:operational",period)})`
 ]);
 const marketing=counters.find(c=>c.key===commercialQuotaKey(businessId,"templates:marketing",period))?.count??0,operational=counters.find(c=>c.key===commercialQuotaKey(businessId,"templates:operational",period))?.count??0;
 return {marketing,operational,invoices:invoices[0]?.count??0,bookings,staff:staff+1,templates:marketing+operational+(counters.find(c=>c.key===commercialQuotaKey(businessId,"templates",period))?.count??0),liveKB:counters.find(c=>c.key===commercialQuotaKey(businessId,"live-kb",period))?.count??0};
}
