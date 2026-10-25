import test from "node:test";
import assert from "node:assert/strict";
import {COMMERCIAL_PLANS,isPublicPaidPlan} from "../app/lib/commercial-plans";
import {getPlanEntitlements,getPlanRank,isSupportedPaidPlan,normalizePlanCode} from "../app/lib/plan-entitlements";
import {commercialMonth,commercialQuotaKey,incrementCommercialQuota} from "../app/lib/commercial-quota-sql";
import {PGlite} from "@electric-sql/pglite";
test("exactly four public plans have increasing prices; identity has no paid features",()=>{
 assert.deepEqual(COMMERCIAL_PLANS.map(p=>[p.code,p.monthlyPrice]),[["FREE",0],["OPERATE",199],["GROWTH",399],["SCALE",699]]);
 const free=getPlanEntitlements("FREE");assert.equal(free.bookings,false);assert.equal(free.cashier,false);assert.equal(free.whatsappMarketing,false);assert.equal(free.liveView,false);assert.equal(free.staffLimit,1);
});
test("paid plan features and prices share a catalogue, while legacy contracts keep their rights",()=>{
 for(const p of COMMERCIAL_PLANS){const e=getPlanEntitlements(p.code);assert.equal(e.productLimit,p.productLimit);assert.equal(e.staffLimit,p.staffLimit);assert.equal(e.monthlyTemplates,p.monthlyTemplates);assert.equal(e.branchLimit,p.branchLimit);assert.equal(e.liveCameraLimit,p.cameras);}
 assert.equal(getPlanEntitlements("OPERATE").cashier,true);assert.equal(getPlanEntitlements("OPERATE").whatsappMarketing,false);
 assert.equal(getPlanEntitlements("GROWTH").whatsappMarketing,true);assert.equal(getPlanEntitlements("GROWTH").liveView,false);
 assert.equal(getPlanEntitlements("SCALE").liveView,true);
 for(const code of ["BUSINESS","PRO"]){assert.equal(isSupportedPaidPlan(code),true);assert.equal(isPublicPaidPlan(code),false);assert.equal(getPlanEntitlements(code).whatsappMarketing,true);assert.equal(getPlanEntitlements(code).staffLimit,null);}
 assert.ok(getPlanRank("SCALE")>getPlanRank("PRO"));assert.equal(normalizePlanCode(" scale "),"SCALE");assert.equal(normalizePlanCode("invented"),"FREE");
});
test("billing periods reset at midnight in Riyadh, independently from server time",()=>{
 const last=commercialMonth(new Date("2026-10-31T20:59:59Z")),next=commercialMonth(new Date("2026-10-31T21:00:00Z"));
 assert.equal(last.end.toISOString(),"2026-10-31T21:00:00.000Z");assert.equal(next.start.toISOString(),last.end.toISOString());assert.notEqual(last.period,next.period);
 assert.notEqual(commercialQuotaKey("a","templates",last.period),commercialQuotaKey("b","templates",last.period));
 assert.notEqual(commercialQuotaKey("a","templates",last.period),commercialQuotaKey("a","templates",next.period));
});
test("real quota SQL caps concurrent increments without overdraft or charging a denied request",async()=>{
 const db=new PGlite();try{
 await db.exec('CREATE TABLE "RequestRateLimit" (key text PRIMARY KEY,"windowStart" timestamptz,count int,"updatedAt" timestamptz)');
 const now=new Date("2026-10-25T00:00:00Z"),{start,period}=commercialMonth(now),key=commercialQuotaKey("a","templates",period);
 const q=incrementCommercialQuota(key,1,10,start,now);
 const results=await Promise.all(Array.from({length:20},()=>db.query(q.text,q.values)));
 assert.equal(results.filter(r=>r.rows.length).length,10);assert.equal((await db.query<{count:number}>('SELECT count FROM "RequestRateLimit" WHERE key=$1',[key])).rows[0].count,10);
 const other=incrementCommercialQuota(commercialQuotaKey("b","templates",period),3,10,start,now);await db.query(other.text,other.values);
 assert.equal((await db.query<{count:number}>('SELECT count FROM "RequestRateLimit" WHERE key=$1',[key])).rows[0].count,10);
 const tooLarge=incrementCommercialQuota(key,2,10,start,now);assert.equal((await db.query(tooLarge.text,tooLarge.values)).rows.length,0);
 assert.throws(()=>incrementCommercialQuota(key,1,0,start,now));
 }finally{await db.close();}
});

test("operational cleanup retains current monthly budgets after a week of inactivity",async()=>{
 const {readFile}=await import("node:fs/promises");
 const source=await readFile(new URL("../scripts/prune-expired-operational-data.ts",import.meta.url),"utf8");
 const query=source.match(/db\.\$executeRaw`(DELETE FROM "RequestRateLimit"[^`]+)`/)![1];
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE "RequestRateLimit" (key text PRIMARY KEY,"windowStart" timestamptz,count int,"updatedAt" timestamptz);
 INSERT INTO "RequestRateLimit" VALUES
 ('commercial:active',date_trunc('month',CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh',100,CURRENT_TIMESTAMP-INTERVAL '8 days'),
 ('commercial:old',CURRENT_TIMESTAMP-INTERVAL '65 days',100,CURRENT_TIMESTAMP-INTERVAL '40 days'),
 ('ordinary',CURRENT_TIMESTAMP-INTERVAL '8 days',10,CURRENT_TIMESTAMP-INTERVAL '8 days');`);
 await db.exec(query);assert.deepEqual((await db.query<{key:string}>('SELECT key FROM "RequestRateLimit" ORDER BY key')).rows.map(r=>r.key),['commercial:active']);
 }finally{await db.close();}
});
