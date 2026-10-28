import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";
import {Prisma} from "@prisma/client";
import {PGlite,type Transaction} from "@electric-sql/pglite";
import {LAUNDRY_ACCOUNTS} from "../app/lib/laundry-ledger-domain";
import * as ledgerDomain from "../app/lib/laundry-ledger-domain";
import * as domain from "../app/lib/laundry-domain";
import * as preflight from "../app/lib/accounting-correction-preflight";
type Api=typeof import("../app/lib/accounting-ownership-correction");
async function load(file:string,deps:Record<string,unknown>){
 const source=await readFile(new URL(file,import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:Record<string,unknown>={};runInNewContext(code,{exports,Map,Set,Date,Error,JSON,require:(id:string)=>deps[id]??{}});return exports;
}
function adapter(pg:PGlite|Transaction){
 const query=(sql:TemplateStringsArray|Prisma.Sql,values:unknown[])=>Array.isArray(sql)?Prisma.sql(sql as unknown as TemplateStringsArray,...values):sql as Prisma.Sql;
 return {
  $queryRaw:async(sql:TemplateStringsArray|Prisma.Sql,...values:unknown[])=>{const q=query(sql,values);return (await pg.query(q.text,q.values)).rows;},
  $executeRaw:async(sql:TemplateStringsArray|Prisma.Sql,...values:unknown[])=>{const q=query(sql,values);return (await pg.query(q.text,q.values)).affectedRows??0;},
  business:{findMany:async()=> (await pg.query('SELECT id FROM "Business"')).rows},
 } as unknown as Prisma.TransactionClient;
}
async function setup(mergeCustomer=true){
 const ledger=await load("../app/lib/laundry-ledger.ts",{"node:crypto":crypto,"./laundry-domain":domain,"./laundry-ledger-domain":ledgerDomain});
 const api=await load("../app/lib/accounting-ownership-correction.ts",{"node:crypto":crypto,"@prisma/client":{Prisma},"./laundry-ledger":ledger,"./accounting-correction-preflight":preflight}) as Api;
 const pg=new PGlite(),c=api.OWNERSHIP_CORRECTION;
 await pg.exec('CREATE TABLE "Business"(id text PRIMARY KEY)');
 await pg.query('INSERT INTO "Business" VALUES ($1),($2)',[c.sourceId,c.targetId]);
 for(const migration of ["20261015190000_laundry_workspace","20261016090000_laundry_ledger","20261016094000_laundry_customers"]){await pg.exec(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`,import.meta.url),"utf8"));}
 await pg.exec(`ALTER TABLE "LaundryTicket" ADD COLUMN "readyNotifyConsentAt" timestamptz;
 CREATE TABLE "LaundryPrepaid"("businessId" text);CREATE TABLE "LaundryPrepaidMovement"("businessId" text);CREATE TABLE "LaundryDelivery"("businessId" text);CREATE TABLE "LaundryReconciliation"("businessId" text);CREATE TABLE "LaundryContract"("businessId" text);CREATE TABLE "WhatsAppAuditLog"("businessId" text,action text);CREATE TABLE "WhatsAppAutomationEvent"("businessId" text,source text);`);
 await pg.query('INSERT INTO "LaundryBook"("businessId","createdBy","initializedAt") VALUES ($1,\'source-owner\',now()),($2,\'target-owner\',now())',[c.sourceId,c.targetId]);
 for(const bid of [c.sourceId,c.targetId])for(const a of LAUNDRY_ACCOUNTS)await pg.query('INSERT INTO "LaundryAccount" VALUES ($1,$2,$3,$4)',[bid,a.code,a.name,a.kind]);
 await pg.query('INSERT INTO "LaundryCustomer"(id,"businessId",name,phone) VALUES (\'sc\',$1,\'private source name\',\'+966500000001\'),(\'tc\',$2,\'private target name\',$3)',[c.sourceId,c.targetId,mergeCustomer?'+966500000001':'+966500000002']);
 await pg.query('INSERT INTO "LaundryService"(id,"businessId",name,category,price) VALUES (\'ss\',$1,\'shirt\',\'laundry\',100),(\'ts\',$2,\'shirt\',\'laundry\',100)',[c.sourceId,c.targetId]);
 for(let i=0;i<4;i++){
  const id=c.ticketIds[i],total=(i+1)*100,paid=i<2?total:0;
  await pg.query('INSERT INTO "LaundryTicket"(id,"businessId",number,"requestId","customerName",phone,items,total,paid,status,"dueAt","createdBy","customerId","readyNotifyConsentAt") VALUES ($1,$2,$3,$4,\'private source name\',\'+966500000001\',$5,$6,$7,$8,now(),\'source-owner\',\'sc\',now())',[id,c.sourceId,i+1,crypto.randomUUID(),JSON.stringify([{serviceId:'ss',name:'shirt',quantity:i+1,unitPrice:100,total}]),total,paid,i===0?'delivered':'ready']);
  await pg.query('INSERT INTO "LaundryAudit" VALUES ($1,$2,\'source-owner\',\'order\',$3,now()),($4,$2,\'source-owner\',\'order-reminder-consent\',$3,now())',[crypto.randomUUID(),c.sourceId,id,crypto.randomUUID()]);
  if(paid)await pg.query('INSERT INTO "LaundryPayment"(id,"businessId","ticketId","requestId",amount,method,"createdBy") VALUES ($1,$2,$3,$4,$5,\'cash\',\'source-owner\')',[`pay-${i}`,c.sourceId,id,crypto.randomUUID(),paid]);
 }
 for(let i=1;i<=9;i++)await pg.query('INSERT INTO "LaundryTicket"(id,"businessId",number,"requestId","customerName",phone,items,total,"dueAt","createdBy","customerId") VALUES ($1,$2,$3,$4,\'private target name\',\'+966500000001\',\'[]\',10,now(),\'target-owner\',\'tc\')',[`target-${i}`,c.targetId,i,crypto.randomUUID()]);
 const post=ledger.postLaundrySource as (tx:Prisma.TransactionClient,input:Record<string,unknown>)=>Promise<unknown>;
 await pg.transaction(async p=>{const tx=adapter(p);for(let i=0;i<4;i++){
  const id=c.ticketIds[i];await post(tx,{businessId:c.sourceId,actorId:'source-owner',id,kind:'order',amount:(i+1)*100,at:new Date(),description:'order'});
  if(i===0)await post(tx,{businessId:c.sourceId,actorId:'source-owner',id,kind:'delivery',amount:100,at:new Date(),description:'delivery'});
  if(i<2)await post(tx,{businessId:c.sourceId,actorId:'source-owner',id:`pay-${i}`,kind:'payment',amount:(i+1)*100,method:'cash',at:new Date(),description:'payment'});
 }});
 await api.ensureOwnershipCorrectionSchema(adapter(pg));
 const apply=()=>pg.transaction(p=>api.applyConfirmedOwnershipCorrection(adapter(p),'admin'));
 const undo=()=>pg.transaction(p=>api.rollbackConfirmedOwnershipCorrection(adapter(p),'admin'));
 const balances=async(bid:string)=>(await pg.query<{accountCode:string;balance:number}>('SELECT "accountCode",SUM(debit-credit)::float8 AS balance FROM "LaundryJournalLine" WHERE "businessId"=$1 GROUP BY "accountCode" ORDER BY "accountCode"',[bid])).rows;
 return {pg,api,c,apply,undo,balances};
}

test("confirmed correction moves only four invoices and two payments, preserves amounts/creator, and reverses/reposts seven immutable journals",async()=>{
 const f=await setup();try{
 const before=await f.balances(f.c.sourceId);
 assert.equal((await f.apply()).state,'applied');
 assert.equal((await f.apply()).replayed,true);
 const rows=(await f.pg.query<{businessId:string;n:number;total:number;paid:number}>('SELECT "businessId",count(*)::int AS n,sum(total)::int AS total,sum(paid)::int AS paid FROM "LaundryTicket" GROUP BY "businessId"')).rows;
 assert.deepEqual(rows,[{businessId:f.c.targetId,n:13,total:1090,paid:300}]);
 const moved=(await f.pg.query<{number:number;createdBy:string;readyNotifyConsentAt:unknown;serviceId:string}>('SELECT number,"createdBy","readyNotifyConsentAt",items->0->>\'serviceId\' AS "serviceId" FROM "LaundryTicket" WHERE id=ANY($1) ORDER BY number',[[...f.c.ticketIds]])).rows;
 assert.deepEqual(moved.map(x=>x.number),[10,11,12,13]);assert.ok(moved.every(x=>x.createdBy==='source-owner'&&x.readyNotifyConsentAt===null&&x.serviceId==='ts'));
 assert.ok((await f.balances(f.c.sourceId)).every(x=>x.balance===0));assert.deepEqual(await f.balances(f.c.targetId),before);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryCustomer" WHERE "businessId"=$1',[f.c.sourceId])).rows[0].n,0);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryAudit" WHERE "businessId"=$1 AND action=\'order-reminder-consent\'',[f.c.targetId])).rows[0].n,0);
 await assert.rejects(f.pg.query('UPDATE "LaundryJournal" SET description=\'tamper\' WHERE "businessId"=$1',[f.c.sourceId]),/IMMUTABLE/);
 const summary=await f.api.ownershipCorrectionSummary(adapter(f.pg));assert.equal(summary?.ticketCount,4);assert.doesNotMatch(JSON.stringify(summary),/private|phone|customerName|snapshot/);
 assert.equal((await f.undo()).state,'rolled_back');assert.equal((await f.undo()).replayed,true);
 assert.deepEqual(await f.balances(f.c.sourceId),before);assert.ok((await f.balances(f.c.targetId)).every(x=>x.balance===0));
 const original=(await f.pg.query<{number:number;customerId:string;serviceId:string}>('SELECT number,"customerId",items->0->>\'serviceId\' AS "serviceId" FROM "LaundryTicket" WHERE "businessId"=$1 ORDER BY number',[f.c.sourceId])).rows;
 assert.deepEqual(original.map(x=>[x.number,x.customerId,x.serviceId]),[[1,'sc','ss'],[2,'sc','ss'],[3,'sc','ss'],[4,'sc','ss']]);
 await assert.rejects(f.apply(),/ALREADY_ROLLED_BACK/);
 }finally{await f.pg.close();}
});

test("correction with a new destination customer is fully recoverable from the sealed backup",async()=>{
 const f=await setup(false);try{await f.apply();assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryCustomer" WHERE "businessId"=$1',[f.c.targetId])).rows[0].n,2);await f.undo();assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryCustomer" WHERE "businessId"=$1',[f.c.targetId])).rows[0].n,1);}finally{await f.pg.close();}
});

test("a closed target period aborts the entire correction including staged parent rows and contact consolidation",async()=>{
 const f=await setup();try{
 await f.pg.query('UPDATE "LaundryBook" SET "lockedBefore"=now()+interval \'1 day\' WHERE "businessId"=$1',[f.c.targetId]);
 await assert.rejects(f.apply(),/الفترة المحاسبية مغلقة/);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryTicket" WHERE "businessId"=$1',[f.c.sourceId])).rows[0].n,4);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryTicket"')).rows[0].n,13);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "AccountingOwnershipCorrection"')).rows[0].n,0);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryJournal"')).rows[0].n,7);
 }finally{await f.pg.close();}
});

test("new complex dependencies or later invoice edits fail closed without partial rollback",async()=>{
 const f=await setup();try{
 await f.pg.query('INSERT INTO "LaundryPrepaid" VALUES ($1)',[f.c.sourceId]);await assert.rejects(f.apply(),/DEPENDENCIES_CHANGED/);await f.pg.exec('DELETE FROM "LaundryPrepaid"');
 await f.apply();await f.pg.query('UPDATE "LaundryTicket" SET notes=\'later edit\' WHERE id=$1',[f.c.ticketIds[0]]);await assert.rejects(f.undo(),/RECORDS_CHANGED_AFTER_APPLY/);
 assert.equal((await f.pg.query<{state:string}>('SELECT state FROM "AccountingOwnershipCorrection"')).rows[0].state,'applied');
 }finally{await f.pg.close();}
});


test("a matching existing destination invoice requires review instead of duplicating revenue",async()=>{
 const f=await setup();try{
 await f.pg.query('UPDATE "LaundryTicket" SET total=100,items=\'[{"serviceId":"ts","name":"shirt","quantity":1,"unitPrice":100,"total":100}]\' WHERE id=\'target-1\'');
 await assert.rejects(f.apply(),/DUPLICATE_CANDIDATE/);
 assert.equal((await f.pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryTicket" WHERE "businessId"=$1',[f.c.sourceId])).rows[0].n,4);
 }finally{await f.pg.close();}
});

test("ownership action requires administrator authentication and an active security hold before opening a transaction",async()=>{
 let transactions=0;
 const correctionId='2026-10-28-sada-layla';
 const dependencies={
  'next/navigation':{redirect:()=>{throw Error('REDIRECT');}},'next/cache':{revalidatePath:()=>{}},
  '../../lib/db':{db:{$transaction:async()=>{transactions++;throw Error('must not transact');}}},
  '../../lib/accounting-ownership-correction':{OWNERSHIP_CORRECTION:{id:correctionId}},
 };
 const form={get:(key:string)=>key==='mode'?'apply':key==='correctionId'?correctionId:null} as FormData;
 const denied=await load('../app/admin/accounting-security/actions.ts',{...dependencies,'../../lib/admin':{requireAdmin:async()=>{throw Error('ADMIN_REQUIRED');}},'../../lib/accounting-security':{ACCOUNTING_SECURITY_HOLD:true}});
 await assert.rejects((denied.correctConfirmedInvoiceOwnership as (f:FormData)=>Promise<void>)(form),/ADMIN_REQUIRED/);
 const noHold=await load('../app/admin/accounting-security/actions.ts',{...dependencies,'../../lib/admin':{requireAdmin:async()=>({id:'admin'})},'../../lib/accounting-security':{ACCOUNTING_SECURITY_HOLD:false}});
 await assert.rejects((noHold.correctConfirmedInvoiceOwnership as (f:FormData)=>Promise<void>)(form),/REDIRECT/);
 assert.equal(transactions,0);
});
