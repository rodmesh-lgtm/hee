import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {PGlite} from '@electric-sql/pglite';
import * as domain from '../app/lib/laundry-domain';
import * as returns from '../app/lib/cashier-return';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const items=[{serviceId:'service',name:'Service',quantity:2,unitPrice:500,total:1000}];
test('partial returns use original prices, prevent repeated quantities and completely reverse rounded commissions',()=>{
 const one=returns.quoteInvoiceReturn(items,[],[{index:0,quantity:1}]);assert.equal(one.amount,500);
 assert.throws(()=>returns.quoteInvoiceReturn(items,one.lines,[{index:0,quantity:2}]));
 assert.throws(()=>returns.quoteInvoiceReturn(items,[],[{index:0,quantity:1},{index:0,quantity:1}]));
 assert.equal(returns.commissionReturnDelta(333,1000,0,500)+returns.commissionReturnDelta(333,1000,500,1000),333);
 assert.deepEqual(returns.invoiceBalance({total:1000,paid:700,returned:500,refunded:0}),{net:500,retained:700,outstanding:0,refundDue:200});
});
async function fixture(){
 const pg=new PGlite();
 await pg.exec(`CREATE TABLE "Business"(id text PRIMARY KEY);INSERT INTO "Business" VALUES('${a}'),('${b}');`);
 await pg.exec(readFileSync('prisma/migrations/20261015190000_laundry_workspace/migration.sql','utf8'));
 await pg.exec(`CREATE TABLE "LaundryBook"("businessId" text PRIMARY KEY,"initializedAt" timestamptz);INSERT INTO "LaundryBook" VALUES('${a}',now()),('${b}',now());
 CREATE TABLE "LaundryPrepaid"(id text PRIMARY KEY,"businessId" text,amount int,remaining int,kind text,"unitsRemaining" int,"unitsIncluded" int,UNIQUE("businessId",id));
 ALTER TABLE "LaundryPayment" ADD UNIQUE("businessId",id);ALTER TABLE "LaundryPayment" DROP CONSTRAINT "LaundryPayment_method_check";
 CREATE TABLE "LaundryPrepaidMovement"(id text,"businessId" text,"prepaidId" text,"paymentId" text,kind text,units int);
 CREATE TABLE "TestJournal"(id text,lines jsonb);
 `);
 await pg.exec(readFileSync('prisma/migrations/20261108100000_cashier_employee_commissions/migration.sql','utf8'));
 await pg.exec(readFileSync('prisma/migrations/20261108140000_cashier_invoice_returns/migration.sql','utf8'));
 let active=a,reads=0,failJournal=false;
 function sql(strings:TemplateStringsArray){return strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,'');}
 const tx={
  $queryRaw:async(strings:TemplateStringsArray,...values:unknown[])=>{reads++;return (await pg.query(sql(strings),values)).rows;},
  $executeRaw:async(strings:TemplateStringsArray,...values:unknown[])=>{if(strings.join('').includes('pg_advisory'))return 1;return (await pg.query(sql(strings),values)).affectedRows??0;}
 };
 const db={...tx,$transaction:async(fn:(t:typeof tx)=>Promise<unknown>)=>{await pg.exec('BEGIN');try{const r=await fn(tx);await pg.exec('COMMIT');return r;}catch(e){await pg.exec('ROLLBACK');throw e;}}};
 const deps:Record<string,unknown>={'node:crypto':{randomUUID},zod:{z},'next/cache':{revalidatePath:()=>{}},'../lib/db':{db},'../lib/auth':{getCurrentUser:async()=>({id:'actor'}),getCurrentUserForApiWrite:async()=>({id:'actor'})},'../lib/active-business':{getActiveBusinessForUser:async()=>active?{id:active}:null},'../lib/laundry-domain':domain,'../lib/cashier-return':returns,'../lib/live-view/order-link':{endOrderLiveSessions:async()=>{}},'../lib/laundry-ledger':{postLaundryJournal:async(_tx:unknown,input:{sourceKey:string;lines:unknown})=>{if(failJournal)throw Error('closed');await pg.query('INSERT INTO "TestJournal" VALUES($1,$2::jsonb)',[input.sourceKey,JSON.stringify(input.lines)]);}}};
 const output={};runInNewContext(ts.transpileModule(readFileSync('app/Laundromat/return-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,require:(id:string)=>deps[id],Date,Error,Math,JSON});
 async function invoice(bid=a,paid=1000,method='cash',units=0){
  const id=randomUUID(),paymentId=randomUUID(),prepaidId=method==='prepaid'?randomUUID():null;
  const number=(await pg.query<{n:number}>('SELECT COALESCE(MAX(number),0)+1 AS n FROM "LaundryTicket" WHERE "businessId"=$1',[bid])).rows[0].n;
  await pg.query(`INSERT INTO "LaundryTicket"(id,"businessId",number,"requestId","customerName",phone,items,total,paid,"dueAt","createdBy") VALUES($1,$2,$3,$4,'Customer','+966500000001',$5::jsonb,1000,$6,now(),'actor')`,[id,bid,number,randomUUID(),JSON.stringify(items),paid]);
  if(paid)await pg.query(`INSERT INTO "LaundryPayment"(id,"businessId","ticketId","requestId",amount,method,"createdBy") VALUES($1,$2,$3,$4,$5,$6,'actor')`,[paymentId,bid,id,randomUUID(),paid,method]);
  if(prepaidId){await pg.query('INSERT INTO "LaundryPrepaid" VALUES($1,$2,1000,0,$3,$4,$5)',[prepaidId,bid,units?'pieces':'credit',units?0:null,units||null]);await pg.query(`INSERT INTO "LaundryPrepaidMovement" VALUES($1,$2,$3,$4,'redeem',$5)`,[randomUUID(),bid,prepaidId,paymentId,units]);}
  await pg.query(`INSERT INTO "CashierCommission"(id,"businessId","ticketId",name,phone,kind,value,base,amount,"createdBy") VALUES($1,$2,$3,'Employee','+966500000099','fixed',333,1000,333,'actor')`,[randomUUID(),bid,id]);
  return {id,paymentId,prepaidId,number};
 }
 return {pg,actions:output as typeof import('../app/Laundromat/return-actions'),invoice,setActive:(v:string)=>active=v,reads:()=>reads,setFail:(v:boolean)=>failJournal=v};
}
test('returns/refunds isolate tenants, preserve invoices, reverse commission, enforce idempotency and distinguish pending cash refunds',async()=>{
 const f=await fixture();try{
  const t=await f.invoice(),foreign=await f.invoice(b),command={type:'return',businessId:a,ticketId:t.id,requestId:randomUUID(),items:[{index:0,quantity:1}],reason:'Partial service return'};
  const before=f.reads();assert.equal((await f.actions.invoiceReturnCommand({...command,businessId:b})).ok,false);assert.equal(f.reads(),before);
  assert.equal((await f.actions.invoiceReturnCommand({...command,ticketId:foreign.id})).ok,false);
  assert.equal((await f.actions.invoiceReturnCommand(command)).ok,true);assert.equal((await f.actions.invoiceReturnCommand(command)).ok,true);
  let view=await f.actions.getInvoiceReturns({businessId:a,ticketId:t.id});assert.equal(view.ok,true);if(!view.ok)throw Error("Missing return view");
  assert.equal(view.view.returns.length,1);assert.equal(view.view.ticket.total,1000);assert.equal(view.view.ticket.paid,1000);assert.equal(view.view.ticket.returned,500);assert.equal(view.view.ticket.refunded,0);
  const refund={type:'refund',businessId:a,ticketId:t.id,paymentId:t.paymentId,requestId:randomUUID(),amount:'5',reference:'cash voucher 123',confirmed:true};
  assert.equal((await f.actions.invoiceReturnCommand({...refund,confirmed:false})).ok,false);
  assert.equal((await f.actions.invoiceReturnCommand(refund)).ok,true);assert.equal((await f.actions.invoiceReturnCommand(refund)).ok,true);
  assert.equal((await f.actions.invoiceReturnCommand({...refund,requestId:randomUUID()})).ok,false);
  assert.equal((await f.actions.invoiceReturnCommand({...command,requestId:randomUUID()})).ok,true);
  assert.equal((await f.actions.invoiceReturnCommand({...command,requestId:randomUUID()})).ok,false);
  const events=await f.pg.query<{net:number}>('SELECT SUM(amount)::int AS net FROM "CashierCommissionEvent" WHERE "businessId"=$1',[a]);assert.equal(events.rows[0].net,0);
  await assert.rejects(f.pg.exec('DELETE FROM "CashierReturn"'));
  view=await f.actions.getInvoiceReturns({businessId:a,ticketId:foreign.id});assert.equal(view.ok,false);
 }finally{await f.pg.close();}
});
test('prepaid returns restore exact original units and rollback all changes when ledger posting fails',async()=>{
 const f=await fixture();try{
  const t=await f.invoice(a,1000,'prepaid',2),command={type:'return',businessId:a,ticketId:t.id,requestId:randomUUID(),items:[{index:0,quantity:2}],reason:'Full package service return'};
  assert.equal((await f.actions.invoiceReturnCommand({...command,items:[{index:0,quantity:1}]})).ok,false);
  f.setFail(true);assert.equal((await f.actions.invoiceReturnCommand(command)).ok,false);
  assert.equal((await f.pg.query<{returned:number}>('SELECT returned FROM "LaundryTicket" WHERE id=$1',[t.id])).rows[0].returned,0);
  f.setFail(false);const result=await f.actions.invoiceReturnCommand(command);assert.equal(result.ok,true,JSON.stringify(result));
  const balance=await f.pg.query<{remaining:number;unitsRemaining:number}>('SELECT remaining,"unitsRemaining" FROM "LaundryPrepaid" WHERE id=$1',[t.prepaidId]);assert.deepEqual(balance.rows[0],{remaining:1000,unitsRemaining:2});
  assert.equal((await f.actions.invoiceReturnCommand(command)).ok,true);
  const view=await f.actions.getInvoiceReturns({businessId:a,ticketId:t.id});assert.equal(view.ok,true);if(view.ok){assert.equal(view.view.refunds.length,1);assert.equal(view.view.ticket.refunded,1000);}
 }finally{await f.pg.close();}
});
