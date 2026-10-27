import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";
import * as policy from "../app/lib/live-view/policy";

test("enrollment commits against the production audit constraint and rejects replay",async()=>{
 const pg=new PGlite();
 try {
  await pg.exec(`CREATE TABLE "Business" (id text PRIMARY KEY);
   CREATE TABLE "LiveViewConnector" (id text PRIMARY KEY,"businessId" text REFERENCES "Business"(id),"pairingHash" text UNIQUE,"pairingExpiresAt" timestamp,"tokenHash" text,"revokedAt" timestamp,"enrolledAt" timestamp);
   CREATE TABLE "WhatsAppAuditLog" (id text PRIMARY KEY,"businessId" text REFERENCES "Business"(id),"actorType" text NOT NULL,action text);`);
  const migration=await readFile(new URL("../prisma/migrations/20260828070000_whatsapp_rbac_audit/migration.sql",import.meta.url),"utf8");
  const constraint=migration.split("\n").find(l=>l.includes('ADD CONSTRAINT "WhatsAppAuditLog_actor_type_check"'));
  assert.ok(constraint);await pg.exec(constraint);
  await assert.rejects(pg.query(`INSERT INTO "WhatsAppAuditLog" (id,"actorType") VALUES ('bad','connector')`),/actor_type_check/);
  const pair=policy.newLiveToken();
  await pg.query(`INSERT INTO "Business" (id) VALUES ('business')`);
  await pg.query(`INSERT INTO "LiveViewConnector" (id,"businessId","pairingHash","pairingExpiresAt") VALUES ('connector','business',$1,now()+interval '10 minutes')`,[pair.hash]);
  const database={
   $transaction:async(fn:(tx:object)=>Promise<unknown>)=>pg.transaction(async sql=>fn({
    $executeRaw:async()=>0,
    business:{findFirst:async()=>({id:"business"})},
    liveViewConnector:{
     findUnique:async(a:{where:{pairingHash:string}})=>(await sql.query(`SELECT id,"businessId" FROM "LiveViewConnector" WHERE "pairingHash"=$1`,[a.where.pairingHash])).rows[0]||null,
     updateMany:async(a:{where:{id:string;pairingHash:string};data:{tokenHash:string}})=>({count:(await sql.query(`UPDATE "LiveViewConnector" SET "tokenHash"=$1,"pairingHash"=null,"pairingExpiresAt"=null,"enrolledAt"=now() WHERE id=$2 AND "pairingHash"=$3 AND "pairingExpiresAt">now() AND "tokenHash" IS NULL AND "revokedAt" IS NULL RETURNING id`,[a.data.tokenHash,a.where.id,a.where.pairingHash])).rows.length})},
    whatsAppAuditLog:{create:async(a:{data:{businessId:string;actorType:string;action:string}})=>{
     const d=a.data;await sql.query(`INSERT INTO "WhatsAppAuditLog" (id,"businessId","actorType",action) VALUES ($1,$2,$3,$4)`,[randomUUID(),d.businessId,d.actorType,d.action]);
    }}
   }))
  };
  const dependencies:Record<string,unknown>={
   "../../../../lib/db":{db:database},
   "../../../../lib/live-view/access":{livePrivateHeaders:{"Cache-Control":"private, no-store"}},
   "../../../../lib/live-view/connector-server":{connectorPlatformConfig:()=>({}),boundedJson:(r:Request)=>r.json()},
   "../../../../lib/live-view/policy":policy,
   "../../../../lib/rate-limit":{consumePublicWriteLimit:async()=>({allowed:true}),requestClientAddress:()=>"test"}
  };
  const source=await readFile(new URL("../app/api/live-view/connectors/enroll/route.ts",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports:{POST?:(r:Request)=>Promise<Response>}={};
  runInNewContext(compiled,{exports,require:(id:string)=>{assert.ok(id in dependencies,id);return dependencies[id];},Response,Date});
  assert.ok(exports.POST);
  const request=()=>new Request("https://ir.sa/api/live-view/connectors/enroll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:pair.token})});
  const response=await exports.POST(request());assert.equal(response.status,200);
  const body=await response.json();assert.equal(policy.validLiveToken(body.token),true);
  const saved=await pg.query<{tokenHash:string;pairingHash:null}>(`SELECT "tokenHash","pairingHash" FROM "LiveViewConnector"`);
  assert.equal(saved.rows[0].tokenHash,policy.liveTokenHash(body.token));assert.equal(saved.rows[0].pairingHash,null);
  const audit=await pg.query<{actorType:string;action:string}>(`SELECT "actorType",action FROM "WhatsAppAuditLog"`);
  assert.deepEqual(audit.rows,[{actorType:"system",action:"live-view.connector.enrolled"}]);
  assert.equal((await exports.POST(request())).status,410);
  assert.equal((await pg.query(`SELECT id FROM "WhatsAppAuditLog"`)).rows.length,1);
 }finally{await pg.close();}
});
