import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { PGlite } from "@electric-sql/pglite";
import { commissionQuote } from "../app/lib/cashier-commission";
import { laundryReportRange } from "../app/lib/laundry-report";
import { normalizeAccountPhone } from "../app/lib/account-profile-domain";

test("commission uses integer halalas, rounds half-up and rejects invalid or excessive amounts",()=>{
  assert.deepEqual(commissionQuote("fixed","12.50",10000),{kind:"fixed",value:1250,base:10000,amount:1250});
  assert.equal(commissionQuote("percent","2.50",9999).amount,250);
  assert.equal(commissionQuote("percent","50",101).amount,51);
  assert.equal(commissionQuote("percent","100",100000000).amount,100000000);
  for(const [kind,value,base] of [["fixed","101",10000],["percent","100.01",10000],["percent","0.01",1],["fixed","0",10000],["fixed","-1",10000],["fixed","1.001",10000],["fixed","1",0],["fixed","1",NaN]] as const)
    assert.throws(()=>commissionQuote(kind,value,base));
});

async function database() {
  const pg=new PGlite();
  await pg.exec(`CREATE TABLE "Business" (id text PRIMARY KEY);
    CREATE TABLE "LaundryTicket" (id text PRIMARY KEY,"businessId" text,number int,UNIQUE("businessId",id));
    INSERT INTO "Business" VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
    INSERT INTO "LaundryTicket" VALUES ('a','11111111-1111-4111-8111-111111111111',1),('b','22222222-2222-4222-8222-222222222222',2);`);
  await pg.exec(readFileSync("prisma/migrations/20261108100000_cashier_employee_commissions/migration.sql","utf8"));
  return pg;
}
const a="11111111-1111-4111-8111-111111111111", b="22222222-2222-4222-8222-222222222222";
const insert=`INSERT INTO "CashierCommission" (id,"businessId","ticketId",name,phone,kind,value,base,amount,"createdBy","createdAt") VALUES ($1,$2,$3,$4,'+966500000001','fixed',500,10000,500,'actor','2026-11-08T08:00:00Z')`;

test("database rejects cross-tenant invoices, duplicate commission and incorrect arithmetic",async()=>{
  const pg=await database();
  try {
    await pg.query(insert,["one",a,"a","Alice"]);
    await assert.rejects(pg.query(insert,["foreign",a,"b","Wrong"]));
    await assert.rejects(pg.query(insert,["duplicate",a,"a","Alice"]));
    await assert.rejects(pg.exec(`UPDATE "CashierCommission" SET amount=501 WHERE id='one'`));
    await assert.rejects(pg.exec(`UPDATE "CashierCommission" SET phone='invalid' WHERE id='one'`));
    await pg.query(insert,["two",b,"b","Bob"]);
    assert.equal((await pg.query(`SELECT * FROM "CashierCommission"`)).rows.length,2);
  } finally { await pg.close(); }
});

test("report and employee lookup authorize active tenant before queries and isolate a shared phone",async()=>{
  const pg=await database();
  try {
    await pg.query(insert,["one",a,"a","Alice"]);await pg.query(insert,["two",b,"b","Bob"]);
    let authorized=true,reads=0; const sections:string[]=[];
    const tx={$queryRaw:async(strings:TemplateStringsArray,...values:unknown[])=>{reads++;return (await pg.query(strings.reduce((text,part,i)=>text+(i?`$${i}`:"")+part,""),values)).rows;}};
    const dependencies:Record<string,unknown>={"zod":{z},"../lib/auth":{getCurrentUser:async()=>({id:"actor"})},"../lib/active-business":{getActiveBusinessForUser:async(_user:string,section:string)=>{sections.push(section);return authorized?{id:a}:null;}},"../lib/db":{db:{...tx,$transaction:async(fn:(db:typeof tx)=>Promise<unknown>)=>fn(tx)}},"../lib/laundry-customer":{laundryCustomerPhone:normalizeAccountPhone},"../lib/laundry-report":{laundryReportRange}};
    const output:Record<string,unknown>={};
    const code=ts.transpileModule(readFileSync("app/Laundromat/commission-actions.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    runInNewContext(code,{exports:output,require:(id:string)=>dependencies[id],Date,Error});
    const actions=output as typeof import("../app/Laundromat/commission-actions");
    const input={businessId:a,from:"2026-11-01",to:"2026-11-30",page:0};
    assert.equal((await actions.getCommissionReport({...input,businessId:b})).ok,false);assert.equal(reads,0);
    authorized=false;assert.equal((await actions.getCommissionReport(input)).ok,false);assert.equal(reads,0);authorized=true;
    const report=await actions.getCommissionReport(input);assert.equal(report.ok,true);
    if(report.ok){assert.equal(report.report.count,1);assert.equal(report.report.amount,500);assert.equal(report.report.employees[0].name,"Alice");assert.equal(report.report.entries[0].number,1);}
    const employee=await actions.findCommissionEmployee({businessId:a,phone:"0500000001"});assert.equal(employee.ok,true);if(employee.ok)assert.equal(employee.name,"Alice");
    const before=reads;assert.equal((await actions.findCommissionEmployee({businessId:b,phone:"0500000001"})).ok,false);assert.equal(reads,before);
    assert.ok(sections.includes("laundryAccounting"));assert.ok(sections.includes("laundry"));
  } finally {await pg.close();}
});
