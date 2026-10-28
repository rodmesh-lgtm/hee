import { ACCOUNTING_SECURITY_HOLD } from "../accounting-security";
import {Prisma} from "@prisma/client";
import {cashierNotice} from "./cashier-notice-domain";
/** Same query is used when scheduling and immediately before sending: no stale balances or status. */
export function cashierNoticeTicketsQuery(input:{businessId:string;trigger:string;activatedAt:Date;now:Date;ticketId?:string;phone?:string;limit?:number;pendingOnly?:boolean}){
 const n=cashierNotice(input.trigger);if(!n)throw new Error("CASHIER_NOTICE_INVALID");
 const status=input.trigger==="cashier_review_request"?"delivered":"ready",cutoff=new Date(input.now.getTime()-n.hours*3600000);
 return Prisma.sql`SELECT t.id,t.number,t.phone,t."customerName",b.name AS "businessName",(t.total-t.paid)::int AS remaining
 FROM "LaundryTicket" t JOIN "Business" b ON b.id=t."businessId"
 WHERE ${!ACCOUNTING_SECURITY_HOLD} AND t."businessId"=${input.businessId} AND b."deletedAt" IS NULL AND t.status=${status}
 AND t."createdAt">=${input.activatedAt} AND t."createdAt"<=${input.now}
 AND EXISTS(SELECT 1 FROM "LaundryAudit" c WHERE c."businessId"=t."businessId" AND c."targetId"=t.id AND c.action=${n.consent} AND c."createdAt"<=${input.now})
 AND (SELECT MAX(s."createdAt") FROM "LaundryAudit" s WHERE s."businessId"=t."businessId" AND s."targetId"=t.id AND s.action='status')<=${cutoff}
 ${input.trigger==="cashier_payment_reminder"?Prisma.sql`AND t.paid<t.total`:Prisma.empty}
 ${input.ticketId?Prisma.sql`AND t.id=${input.ticketId}`:Prisma.empty}
 ${input.phone?Prisma.sql`AND t.phone=${input.phone}`:Prisma.empty}
 AND NOT EXISTS(SELECT 1 FROM "WhatsAppContact" c WHERE c."businessId"=t."businessId" AND c."phoneE164"=t.phone AND (c."optedOutAt" IS NOT NULL OR c."deletedAt" IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM "WhatsAppConsent" c WHERE c."businessId"=t."businessId" AND c."phoneE164"=t.phone AND c."revokedAt" IS NOT NULL)
 ${input.pendingOnly?Prisma.sql`AND NOT EXISTS(SELECT 1 FROM "WhatsAppAutomationEvent" e WHERE e."businessId"=t."businessId" AND e.source='cashier.followup' AND e."externalEventId"=t.id || ':' || ${input.trigger})`:Prisma.empty}
 ORDER BY t."createdAt",t.id LIMIT ${Math.max(1,Math.min(50,input.limit??50))}`;
}
