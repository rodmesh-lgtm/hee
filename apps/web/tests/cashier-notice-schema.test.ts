import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { cashierNoticeStorageQuery } from "../app/lib/whatsapp/cashier-notice-schema";
import { WHATSAPP_AUTOMATION_TRIGGER_TYPES } from "../app/lib/whatsapp/automation-domain";

test("forward migration retains existing automation rows and admits all cashier notices without accepting arbitrary triggers",async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE TABLE "WhatsAppAutomation"(id text PRIMARY KEY,"triggerType" text,
   CONSTRAINT "WhatsAppAutomation_trigger_check" CHECK ("triggerType" IN ('welcome','laundry_ready')));
   INSERT INTO "WhatsAppAutomation" VALUES('existing','welcome');`);
  const ready=async()=>{const q=cashierNoticeStorageQuery("cashier_payment_reminder");return (await db.query<{ready:boolean}>(q.text,q.values)).rows[0].ready;};
  assert.equal(await ready(),false);
  await db.exec(readFileSync("prisma/migrations/20261026050000_cashier_followup_trigger_types/migration.sql","utf8"));
  assert.equal(await ready(),true);
  assert.deepEqual((await db.query(`SELECT "triggerType" FROM "WhatsAppAutomation" WHERE id='existing'`)).rows,[{triggerType:"welcome"}]);
  for(const trigger of WHATSAPP_AUTOMATION_TRIGGER_TYPES)await db.query(`INSERT INTO "WhatsAppAutomation" VALUES($1,$2)`,[trigger,trigger]);
  await assert.rejects(db.query(`INSERT INTO "WhatsAppAutomation" VALUES('bad','arbitrary_event')`));
  assert.throws(()=>cashierNoticeStorageQuery("welcome"));
  assert.throws(()=>cashierNoticeStorageQuery("cashier_payment_reminder' OR true --"));
 }finally{await db.close();}
});
