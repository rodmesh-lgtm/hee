import "server-only";
import type { Prisma } from "@prisma/client";
import { laundryReadyParameters } from "./laundry-ready-domain";
type ReadDb=Pick<Prisma.TransactionClient,"$queryRaw">;
export async function laundryReadyContext(db:ReadDb,businessId:string,ticketId:string,phone:string){
 const rows=await db.$queryRaw<Array<{number:number;customerName:string;businessName:string}>>`SELECT t.number,t."customerName",b.name AS "businessName" FROM "LaundryTicket" t JOIN "Business" b ON b.id=t."businessId" WHERE t.id=${ticketId} AND t."businessId"=${businessId} AND t.phone=${phone} AND t.status='ready' AND t."readyNotifyConsentAt" IS NOT NULL AND b."deletedAt" IS NULL`;
 const t=rows[0];return t?laundryReadyParameters(t.customerName,t.businessName,String(t.number)):null;
}
export async function enqueueLaundryReady(tx:Prisma.TransactionClient,businessId:string,ticketId:string){
 const tickets=await tx.$queryRaw<Array<{phone:string;customerName:string}>>`SELECT phone,"customerName" FROM "LaundryTicket" WHERE id=${ticketId} AND "businessId"=${businessId} AND status='ready' AND "readyNotifyConsentAt" IS NOT NULL`;
 const t=tickets[0];if(!t)return;
 const a=await tx.whatsAppAutomation.findFirst({where:{businessId,triggerType:"laundry_ready",status:"active"},select:{id:true}});if(!a)return;
 const c=await tx.whatsAppContact.upsert({where:{businessId_phoneE164:{businessId,phoneE164:t.phone}},create:{businessId,phoneE164:t.phone,displayName:t.customerName,source:"laundry.ready"},update:{},select:{id:true,optedOutAt:true,deletedAt:true}});
 if(c.optedOutAt||c.deletedAt)return;
 await tx.whatsAppAutomationEvent.upsert({where:{businessId_source_externalEventId:{businessId,source:"laundry.ready",externalEventId:ticketId}},create:{businessId,automationId:a.id,source:"laundry.ready",externalEventId:ticketId,triggerType:"laundry_ready",subjectType:"laundry.ticket.ready",subjectId:ticketId,contactId:c.id,occurredAt:new Date()},update:{}});
}
