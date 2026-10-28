import { Prisma } from "@prisma/client";
export function accountingCorrectionPreflightQuery(sourceId:string,targetId:string){
 return Prisma.sql`SELECT
 (SELECT count(*)::int FROM "LaundryTicket" WHERE "businessId"=${sourceId}) AS tickets,
 (SELECT count(*)::int FROM "LaundryCustomer" WHERE "businessId"=${sourceId}) AS customers,
 (SELECT count(*)::int FROM "LaundryPayment" WHERE "businessId"=${sourceId}) AS payments,
 (SELECT count(*)::int FROM "LaundryPrepaid" WHERE "businessId"=${sourceId}) AS prepaid,
 (SELECT count(*)::int FROM "LaundryPrepaidMovement" WHERE "businessId"=${sourceId}) AS "prepaidMovements",
 (SELECT count(*)::int FROM "LaundryDelivery" WHERE "businessId"=${sourceId}) AS deliveries,
 (SELECT count(*)::int FROM "LaundryJournal" WHERE "businessId"=${sourceId}) AS journals,
 (SELECT count(*)::int FROM "LaundryReconciliation" WHERE "businessId"=${sourceId}) AS reconciliations,
 (SELECT count(*)::int FROM "LaundryContract" WHERE "businessId"=${sourceId}) AS contracts,
 (SELECT count(*)::int FROM "LaundryTicket" WHERE "businessId"=${targetId}) AS "targetTickets",
 (SELECT count(*)::int FROM "LaundryPayment" WHERE "businessId"=${targetId}) AS "targetPayments",
 (SELECT count(*)::int FROM "LaundryJournal" WHERE "businessId"=${targetId}) AS "targetJournals",
 (SELECT count(*)::int FROM "LaundryBook" WHERE "businessId"=${targetId} AND "initializedAt" IS NOT NULL) AS "targetInitializedBooks",
 (SELECT "lockedBefore" FROM "LaundryBook" WHERE "businessId"=${targetId}) AS "targetLockedBefore",
 (SELECT count(*)::int FROM "WhatsAppAuditLog" WHERE "businessId"=${sourceId} AND action='live-view.order.linked') AS "liveOrderLinks",
 (SELECT count(*)::int FROM "WhatsAppAutomationEvent" WHERE "businessId"=${sourceId} AND source IN ('laundry.ready','cashier.followup')) AS "noticeEvents"`;
}
export type AccountingCorrectionPreflight={tickets:number;customers:number;payments:number;prepaid:number;prepaidMovements:number;deliveries:number;journals:number;reconciliations:number;contracts:number;targetTickets:number;targetPayments:number;targetJournals:number;targetInitializedBooks:number;targetLockedBefore:Date|null;liveOrderLinks:number;noticeEvents:number};
