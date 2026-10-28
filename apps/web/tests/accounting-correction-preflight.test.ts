import assert from "node:assert/strict";
import test from "node:test";
import {PGlite} from "@electric-sql/pglite";
import {accountingCorrectionPreflightQuery,type AccountingCorrectionPreflight} from "../app/lib/accounting-correction-preflight";
test("correction preflight reports source and destination dependencies separately and cannot mutate invoices",async()=>{
 const pg=new PGlite();try{
 await pg.exec(`CREATE TABLE "LaundryTicket"("businessId" text);CREATE TABLE "LaundryCustomer"("businessId" text);CREATE TABLE "LaundryPayment"("businessId" text);CREATE TABLE "LaundryPrepaid"("businessId" text);CREATE TABLE "LaundryPrepaidMovement"("businessId" text);CREATE TABLE "LaundryDelivery"("businessId" text);CREATE TABLE "LaundryJournal"("businessId" text);CREATE TABLE "LaundryReconciliation"("businessId" text);CREATE TABLE "LaundryContract"("businessId" text);CREATE TABLE "LaundryBook"("businessId" text,"initializedAt" timestamptz,"lockedBefore" timestamptz);CREATE TABLE "WhatsAppAuditLog"("businessId" text,action text);CREATE TABLE "WhatsAppAutomationEvent"("businessId" text,source text);
 INSERT INTO "LaundryTicket" VALUES ('a'),('a'),('b');INSERT INTO "LaundryPayment" VALUES('a'),('b'),('b');INSERT INTO "LaundryJournal" VALUES('b');INSERT INTO "LaundryBook" VALUES('b',now(),null);INSERT INTO "LaundryPrepaid" VALUES('a');INSERT INTO "WhatsAppAutomationEvent" VALUES('a','laundry.ready'),('b','cashier.followup');`);
 const query=accountingCorrectionPreflightQuery('a','b');
 const r=(await pg.query<AccountingCorrectionPreflight>(query.text,query.values)).rows[0];
 assert.equal(r.tickets,2);assert.equal(r.targetTickets,1);assert.equal(r.payments,1);assert.equal(r.targetPayments,2);assert.equal(r.journals,0);assert.equal(r.targetJournals,1);assert.equal(r.prepaid,1);assert.equal(r.noticeEvents,1);assert.equal(r.targetInitializedBooks,1);
 assert.doesNotMatch(query.text,/INSERT|UPDATE|DELETE|customerName|phone|items/);
 const evil=accountingCorrectionPreflightQuery("a' OR true --",'b');assert.equal((await pg.query<AccountingCorrectionPreflight>(evil.text,evil.values)).rows[0].tickets,0);
 }finally{await pg.close();}
});
