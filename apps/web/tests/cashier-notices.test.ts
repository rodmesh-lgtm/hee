import test from "node:test";
import {cashierNoticeTicketsQuery} from "../app/lib/whatsapp/cashier-notice-query";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {CASHIER_NOTICES,cashierNoticeEvent,cashierNoticeParameters,cashierNoticeTemplateSupported,reviewUrl} from "../app/lib/whatsapp/cashier-notice-domain";
import {WHATSAPP_CONFIGURABLE_TRIGGER_TYPES,automationMatchesEvent} from "../app/lib/whatsapp/automation-domain";
test("cashier followups use internal order events, exact approved variables and safe review links",()=>{
 for(const n of CASHIER_NOTICES){
  assert.equal(cashierNoticeEvent({triggerType:n.trigger,source:"cashier.followup",subjectType:n.trigger}),true);
  assert.equal(cashierNoticeEvent({triggerType:n.trigger,source:"tenant.api",subjectType:n.trigger}),false);
  assert.equal((WHATSAPP_CONFIGURABLE_TRIGGER_TYPES as readonly string[]).includes(n.trigger),false);
  assert.equal(automationMatchesEvent({triggerType:n.trigger,triggerConfig:{version:1},subjectType:n.trigger}),true);
  const t={name:n.name,category:"utility",components:[{type:"BODY",text:n.body}],parameterFormat:"POSITIONAL"};
  assert.equal(cashierNoticeTemplateSupported(n.trigger,t),true);
  assert.equal(cashierNoticeTemplateSupported(n.trigger,{...t,name:"unrelated_promotion"}),false);
  assert.equal(cashierNoticeTemplateSupported(n.trigger,{...t,components:[...t.components,{type:"BUTTONS",buttons:[]}]}),false);
  assert.equal(cashierNoticeTemplateSupported(n.trigger,{...t,category:"marketing"}),n.trigger==="cashier_review_request");
 }
 assert.equal(reviewUrl("http://example.com"),null);assert.equal(reviewUrl("https://user:pass@example.com"),null);assert.equal(reviewUrl("javascript:alert(1)"),null);
 const ticket={id:"t",number:42,phone:"+966500000000",customerName:"عميل",businessName:"منشأة",remaining:1575};
 assert.equal(cashierNoticeParameters("cashier_payment_reminder",ticket)?.[0].parameters[3].text,"15.75");
 assert.equal(cashierNoticeParameters("cashier_review_request",ticket),null);
});
test("real followup query isolates tenants and rechecks consent, status, balance, activation, opt-outs, and duplicate events",async()=>{
 const d=new PGlite();try{
 await d.exec(`CREATE TABLE "Business"(id text PRIMARY KEY,name text,"deletedAt" timestamptz);
 CREATE TABLE "LaundryTicket"(id text,"businessId" text,number int,phone text,"customerName" text,total int,paid int,status text,"createdAt" timestamptz);
 CREATE TABLE "LaundryAudit"("businessId" text,"targetId" text,action text,"createdAt" timestamptz);
 CREATE TABLE "WhatsAppContact"("businessId" text,"phoneE164" text,"optedOutAt" timestamptz,"deletedAt" timestamptz);
 CREATE TABLE "WhatsAppConsent"("businessId" text,"phoneE164" text,"revokedAt" timestamptz);
 CREATE TABLE "WhatsAppAutomationEvent"("businessId" text,source text,"externalEventId" text);
 INSERT INTO "Business" VALUES('a','A',NULL),('b','B',NULL);
 INSERT INTO "LaundryTicket" VALUES('t','a',1,'+966500000000','عميل',10000,2500,'ready','2026-10-22T00:00Z'),('other','b',2,'+966500000000','آخر',10000,0,'delivered','2026-10-22T00:00Z');
 INSERT INTO "LaundryAudit" VALUES('a','t','status','2026-10-23T00:00Z'),('a','t','order-reminder-consent','2026-10-22T00:00Z');`);
 const now=new Date("2026-10-25T00:00Z"),activatedAt=new Date("2026-10-21T00:00Z");
 const fetch=async(trigger="cashier_payment_reminder",pendingOnly=false)=>{const q=cashierNoticeTicketsQuery({businessId:"a",trigger,now,activatedAt,pendingOnly});return (await d.query<{id:string;remaining:number}>(q.text,q.values)).rows;};
 assert.deepEqual((await fetch()).map(t=>[t.id,t.remaining]),[['t',7500]]);
 assert.equal((await fetch("cashier_pickup_reminder")).length,1);assert.deepEqual(await fetch("cashier_review_request"),[]);
 await d.exec(`UPDATE "LaundryTicket" SET paid=total WHERE id='t'`);assert.deepEqual(await fetch(),[]);
 await d.exec(`UPDATE "LaundryTicket" SET paid=2500 WHERE id='t'; UPDATE "LaundryAudit" SET "createdAt"='2026-10-24T23:30Z' WHERE action='status'`);assert.deepEqual(await fetch(),[]);
 await d.exec(`UPDATE "LaundryAudit" SET "createdAt"='2026-10-23T00:00Z' WHERE action='status'; INSERT INTO "WhatsAppConsent" VALUES('a','+966500000000','2026-10-24T00:00Z')`);assert.deepEqual(await fetch(),[]);
 await d.exec(`DELETE FROM "WhatsAppConsent"; INSERT INTO "WhatsAppContact" VALUES('a','+966500000000','2026-10-24T00:00Z',NULL)`);assert.deepEqual(await fetch(),[]);
 await d.exec(`DELETE FROM "WhatsAppContact"; INSERT INTO "WhatsAppAutomationEvent" VALUES('a','cashier.followup','t:cashier_payment_reminder')`);
 assert.equal((await fetch()).length,1);assert.deepEqual(await fetch("cashier_payment_reminder",true),[]);
 await d.exec(`INSERT INTO "LaundryAudit" VALUES('a','t','order-review-consent','2026-10-22T00:00Z')`);await d.exec(`UPDATE "LaundryTicket" SET status='delivered',paid=total WHERE id='t'`);assert.equal((await fetch("cashier_review_request")).length,1);
 const q=cashierNoticeTicketsQuery({businessId:"a",trigger:"cashier_review_request",activatedAt:new Date("2026-10-24T00:00Z"),now});assert.deepEqual((await d.query(q.text,q.values)).rows,[]);
 await d.exec(`DELETE FROM "LaundryAudit" WHERE action='order-reminder-consent'`);assert.deepEqual(await fetch(),[]);
 }finally{await d.close();}
});
