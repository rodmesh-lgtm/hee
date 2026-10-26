import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { whatsappHubCountsQuery, type WhatsAppHubCounts } from "../app/lib/whatsapp/hub-counts-query";
import { shortLinkStatsQuery, type ShortLinkStats } from "../app/lib/short-link-stats-query";

test("consolidated WhatsApp counters keep every metric within its tenant and filter deleted contacts and non-marketing templates",async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE TABLE "WhatsAppContact"("businessId" text,"deletedAt" timestamptz,"optedOutAt" timestamptz,"phoneE164" text);
   CREATE TABLE "WhatsAppConsent"("businessId" text,"phoneE164" text,"revokedAt" timestamptz,source text,"consentedAt" timestamptz);
   CREATE TABLE "WhatsAppConnection"(id text,"businessId" text,"marketingEnabled" bool);
   CREATE TABLE "WhatsAppTemplate"("businessId" text,"connectionId" text,provider text,status text);
   CREATE TABLE "WhatsAppCampaign"("businessId" text);
   CREATE TABLE "WhatsAppAutomation"("businessId" text,"triggerType" text);
   CREATE TABLE "WhatsAppConversation"("businessId" text);
   CREATE TABLE "WhatsAppCommerceIntegration"("businessId" text);
   INSERT INTO "WhatsAppContact" VALUES('a',NULL,NULL,'1'),('a',now(),NULL,'2'),('b',NULL,NULL,'1');
   INSERT INTO "WhatsAppConsent" VALUES('a','1',NULL,'form',now()),('a','2',NULL,'form',now()),('b','1',NULL,'form',now());
   INSERT INTO "WhatsAppConnection" VALUES('m','a',true),('o','a',false),('other','b',true);
   INSERT INTO "WhatsAppTemplate" VALUES('a','m','meta','approved'),('a','o','meta','approved'),('a','other','meta','approved'),('a','m','meta','pending'),('b','other','meta','approved');
   INSERT INTO "WhatsAppCampaign" VALUES('a'),('b');
   INSERT INTO "WhatsAppAutomation" VALUES('a','welcome'),('a','booking_confirmation'),('b','welcome');
   INSERT INTO "WhatsAppConversation" VALUES('a'),('b');
   INSERT INTO "WhatsAppCommerceIntegration" VALUES('a'),('b');`);
  const q=whatsappHubCountsQuery('a');assert.deepEqual((await db.query<WhatsAppHubCounts>(q.text,q.values)).rows,[{contacts:1,templates:1,campaigns:1,automations:1,conversations:1,integrations:1,eligibleAudience:1}]);
  for(const change of [
   `UPDATE "WhatsAppConsent" SET source='booking' WHERE "businessId"='a'`,
   `UPDATE "WhatsAppConsent" SET source='form',"revokedAt"=now() WHERE "businessId"='a'`,
   `UPDATE "WhatsAppConsent" SET "revokedAt"=NULL,"consentedAt"=now()+interval '1 day' WHERE "businessId"='a'`,
   `UPDATE "WhatsAppConsent" SET "consentedAt"=now() WHERE "businessId"='a'; UPDATE "WhatsAppContact" SET "optedOutAt"=now() WHERE "businessId"='a'`,
  ]){await db.exec(change);assert.equal((await db.query<WhatsAppHubCounts>(q.text,q.values)).rows[0].eligibleAudience,0);}
  const injected=whatsappHubCountsQuery("a' OR true --");assert.equal((await db.query<WhatsAppHubCounts>(injected.text,injected.values)).rows[0].contacts,0);
 }finally{await db.close();}
});

test("short-link counters preserve search case rules, non-deleted scope and empty totals",async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE TABLE "BusinessShortLink"("businessId" text,status text,title text,destination text,code text,clicks int);
   INSERT INTO "BusinessShortLink" VALUES('a','active','Alpha','https://a.test','Code',2),('a','disabled','Beta','https://b.test','Other',3),('a','deleted','Alpha','https://a.test','Gone',100),('b','active','Alpha','https://a.test','Else',99);`);
  const stats=async(tenant:string,q:string)=>{const s=shortLinkStatsQuery(tenant,q);return (await db.query<ShortLinkStats>(s.text,s.values)).rows[0];};
  const all=await stats('a','');assert.deepEqual(Object.fromEntries(Object.entries(all).map(([k,v])=>[k,Number(v)])),{total:2,matching:2,active:1,clicks:5});
  assert.equal(Number((await stats('a','ALPHA')).matching),1);
  assert.equal(Number((await stats('a','Code')).matching),1);
  assert.equal(Number((await stats('a','code')).matching),0);
  assert.equal(Number((await stats('b','')).clicks),99);
  assert.equal(Number((await stats("a' OR true --",'')).total),0);
 }finally{await db.close();}
});
