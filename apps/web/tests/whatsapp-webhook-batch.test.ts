import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { processWebhookBatch, UNMATCHED_RECEIPT } from "../app/lib/whatsapp/webhook-batch";
import { webhookClaimQuery } from "../app/lib/whatsapp/webhook-claim-query";

test("an unmatched receipt remains retryable while later inbound events are processed",async()=>{
 const pending=["early-receipt","inbound"],done:string[]=[];
 let messageSaved=false;
 const next=async(excluded:readonly string[])=>{
  const id=pending.find(id=>!excluded.includes(id)&&!done.includes(id));
  if(!id)return {processed:false};
  if(id==="early-receipt"&&!messageSaved)return {processed:false,id,error:UNMATCHED_RECEIPT};
  done.push(id);return {processed:true,id};
 };
 assert.deepEqual(await processWebhookBatch(100,next),{processed:1,deferred:1,failed:0});
 assert.deepEqual(done,["inbound"]);
 messageSaved=true;
 assert.deepEqual(await processWebhookBatch(100,next),{processed:1,deferred:0,failed:0});
 assert.deepEqual(done,["inbound","early-receipt"]);
});

test("tenant mismatch and database failures stay failures while allowing other rows a turn",async()=>{
 const calls:string[]=[];
 const result=await processWebhookBatch(100,async excluded=>{
  if(!excluded.includes("bad")){calls.push("bad");return {processed:false,id:"bad",error:"WHATSAPP_STATUS_TENANT_MISMATCH"};}
  if(!calls.includes("valid")){calls.push("valid");return {processed:true,id:"valid"};}
  return {processed:false};
 });
 assert.deepEqual(result,{processed:1,deferred:0,failed:1});
 assert.deepEqual(calls,["bad","valid"]);
 assert.deepEqual(await processWebhookBatch(100,async()=>({processed:false,error:"DATABASE_UNAVAILABLE"})),{processed:0,deferred:0,failed:1});
 let count=0;await processWebhookBatch(2,async()=>{count++;return {processed:true};});assert.equal(count,2);
});

test("real claim query skips only requested pending rows and prioritizes new work over unmatched receipts",async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE TABLE "WhatsAppWebhookEvent"(id text,"businessId" text,provider text,"phoneNumberId" text,"eventType" text,payload jsonb,"processedAt" timestamptz,"receivedAt" timestamptz,"processingError" text);
   INSERT INTO "WhatsAppWebhookEvent" VALUES
    ('orphan','a','meta','p','message_status','{}',NULL,'2026-10-01','WHATSAPP_STATUS_MESSAGE_NOT_FOUND'),
    ('new','b','meta','q','message_received','{}',NULL,'2026-10-02',NULL),
    ('done','a','meta','p','message_received','{}','2026-10-03','2026-09-01',NULL);`);
  const claim=async(id:string|null=null,exclude:string[]=[])=>{const q=webhookClaimQuery(id,exclude);return (await db.query<{id:string}>(q.text,q.values)).rows.map(r=>r.id);};
  assert.deepEqual(await claim(),["new"]);
  assert.deepEqual(await claim(null,["new"]),["orphan"]);
  assert.deepEqual(await claim("orphan"),["orphan"]);
  assert.deepEqual(await claim("done"),[]);
  assert.deepEqual(await claim(null,["new","orphan"]),[]);
  assert.deepEqual(await claim(null,["new') OR true --"]),["new"]);
 }finally{await db.close();}
});
