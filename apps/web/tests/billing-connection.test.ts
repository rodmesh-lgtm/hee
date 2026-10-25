import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
test("billing connection inspection is operator-only and never returns provider payloads or secrets",async()=>{
 const route=await readFile(new URL("../app/api/billing/readiness/route.ts",import.meta.url),"utf8"),core=await readFile(new URL("../app/lib/billing-readiness.ts",import.meta.url),"utf8");
 assert.match(route,/emailVerifiedAt&&isAdminEmail/);assert.match(route,/origin!==new URL\(request.url\).origin/);assert.match(route,/consumePublicWriteLimit/);
 assert.match(core,/method:"GET"/);assert.match(core,/response.body\?\.cancel/);assert.doesNotMatch(core,/await response\.json/);
});
test("cron lease excludes simultaneous financial workers and an expired owner cannot clear a new lease",async()=>{
 const source=await readFile(new URL("../app/api/cron/billing-operations/route.ts",import.meta.url),"utf8");
 const sql=source.match(/db\.\$queryRaw<Array<\{key:string\}>>`([\s\S]*?)`/)![1].replaceAll('${key}','$1').replaceAll('${now}','$2').replaceAll('${new Date(now.getTime()-10*60000)}','$3');
 const db=new PGlite();try{
 await db.exec('CREATE TABLE "RequestRateLimit" (key text PRIMARY KEY,"windowStart" timestamptz,count int,"updatedAt" timestamptz)');
 const now=new Date("2026-10-25T00:00:00Z"),key="billing:operations:lease";
 const result=await Promise.all(Array.from({length:10},()=>db.query(sql,[key,now,new Date(now.getTime()-600000)])));
 assert.equal(result.filter(r=>r.rows.length).length,1);
 const later=new Date(now.getTime()+660000);assert.equal((await db.query(sql,[key,later,new Date(later.getTime()-600000)])).rows.length,1);
 await db.query('DELETE FROM "RequestRateLimit" WHERE key=$1 AND "windowStart"=$2',[key,now]);
 assert.equal((await db.query('SELECT key FROM "RequestRateLimit"')).rows.length,1);
 }finally{await db.close();}
});
