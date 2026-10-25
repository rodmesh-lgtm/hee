import {Prisma} from "@prisma/client";
export function readyNoticeQuery(businessId:string,ticketId:string,phone:string,activatedAt:Date){
 return Prisma.sql`SELECT t.number,t."customerName",b.name AS "businessName" FROM "LaundryTicket" t JOIN "Business" b ON b.id=t."businessId" WHERE t.id=${ticketId} AND t."businessId"=${businessId} AND t.phone=${phone} AND t.status='ready' AND t."readyNotifyConsentAt" IS NOT NULL AND t."createdAt">=${activatedAt} AND b."deletedAt" IS NULL`;
}
