import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {randomUUID} from "node:crypto";
import ts from "typescript";
import {z} from "zod";
import {PGlite} from "@electric-sql/pglite";
import * as activity from "../app/lib/accounting-program";
import * as cashier from "../app/lib/cashier-activity";
import * as domain from "../app/lib/laundry-domain";
import * as staff from "../app/lib/staff-permissions";

async function moduleExports(file:string,dependencies:Record<string,unknown>) {
 const source=await readFile(new URL(file,import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:Record<string,unknown>={};
 runInNewContext(code,{exports,require:(id:string)=>dependencies[id]??{},Date,Set,Map,Error});return exports;
}
const businessA="11111111-1111-4111-8111-111111111111",businessB="22222222-2222-4222-8222-222222222222";

test("cashier fails closed on an unauthorized selected business instead of falling back to another owned business",async()=>{
 let selected:string|null=businessB;let lookups=0;
 const active=await moduleExports("../app/lib/active-business.ts",{
  "next/headers":{cookies:async()=>({get:(key:string)=>key==="infro_workspace_business"&&selected?{value:selected}:undefined})},
  "./db":{db:{business:{findFirst:async(args:{where:{id?:string}})=>{lookups++;return args.where.id===businessB?null:{id:businessA,ownerId:"owner",members:[]};}}}},
  "./commercial-access":{commercialAccess:async()=>({cashier:true})},"./staff-permissions":staff
 });
 const resolve=active.getActiveBusinessForUser as (user:string,section:string)=>Promise<{id:string}|null>;
 assert.equal(await resolve("owner","laundry"),null);assert.equal(lookups,1);
 selected=null;assert.equal((await resolve("owner","laundry"))?.id,businessA);
});

test("forged cashier writes and clothing preset activation are rejected before any database transaction",async()=>{
 let transactions=0;
 const dependencies={
  "zod":{z},"../lib/auth":{getCurrentUserForApiWrite:async()=>({id:"owner"})},
  "../lib/active-business":{getActiveBusinessForUser:async()=>({id:businessA,ownerId:"owner",businessType:"WORKSHOP"})},
  "../lib/db":{db:{$transaction:async()=>{transactions++;throw Error("must reject before writes");}}},
  "../lib/accounting-program":activity,"../lib/cashier-activity":cashier,"../lib/laundry-domain":domain
 };
 const exports=await moduleExports("../app/Laundromat/actions.ts",dependencies);
 const command=exports.laundryCommand as (input:unknown)=>Promise<{ok:boolean;error?:string}>;
 const forged=await command({type:"service",businessId:businessB,requestId:randomUUID(),name:"ورشة أخرى",category:"صيانة",price:"100"});
 assert.equal(forged.ok,false);assert.match(forged.error||"",/تغيرت المنشأة/);
 const clothing=await command({type:"catalog",businessId:businessA,requestId:randomUUID(),items:[{presetId:"thobe",operation:"wash_iron",price:"10"}]});
 assert.equal(clothing.ok,false);assert.match(clothing.error||"",/مغاسل الملابس/);assert.equal(transactions,0);
});

test("actual customer order queries cannot disclose another tenant's invoices through body or record-id tampering",async()=>{
 const pg=new PGlite();const customerA=randomUUID(),customerB=randomUUID();let active=businessA,queries=0;
 try {
  await pg.exec('CREATE TABLE "LaundryTicket" (id text,number int,"businessId" text,"customerId" text,"createdAt" timestamptz,status text,total int,paid int)');
  await pg.query('INSERT INTO "LaundryTicket" VALUES ($1,1,$2,$3,now(),\'received\',100,0),($4,2,$5,$6,now(),\'received\',900,0)',[randomUUID(),businessA,customerA,randomUUID(),businessB,customerB]);
  await pg.exec('CREATE TABLE "LaundryService" (id text,"businessId" text,name text,category text,active boolean); CREATE TABLE "AccountingPackage" (id text,"businessId" text,name text,description text,amount int,"durationDays" int,"serviceIds" jsonb,active boolean,kind text,"unitsIncluded" int,"createdAt" timestamptz)');
  await pg.query(`INSERT INTO "LaundryService" VALUES ($1,$2,'تغيير زيت المحرك','صيانة دورية',true),($3,$2,'ثوب — غسيل وكوي','ملابس رجالية',true),($4,$5,'ثوب — غسيل وكوي','ملابس رجالية',true)`,[randomUUID(),businessA,randomUUID(),randomUUID(),businessB]);
  await pg.query(`INSERT INTO "AccountingPackage" VALUES ($1,$2,'ورشة A','',100,30,'[]',true,'credit',null,now()),($3,$4,'مغسلة B','',900,30,'[]',true,'credit',null,now())`,[randomUUID(),businessA,randomUUID(),businessB]);
  const raw=async(strings:TemplateStringsArray,...values:unknown[])=>{queries++;return (await pg.query(strings.reduce((sql,part,i)=>sql+(i?`$${i}`:"")+part,""),values)).rows;};
  const exports=await moduleExports("../app/Laundromat/customer-actions.ts",{
   "zod":{z},"../lib/auth":{getCurrentUser:async()=>({id:"owner"})},
   "../lib/active-business":{getActiveBusinessForUser:async()=>({id:active})},
   "../lib/db":{db:{$queryRaw:async(strings:TemplateStringsArray,...values:unknown[])=>{queries++;return (await pg.query(strings.reduce((sql,part,i)=>sql+(i?`$${i}`:"")+part,""),values)).rows;}}}
  });
  const packageExports=await moduleExports("../app/Laundromat/package-actions.ts",{
   "zod":{z},"../lib/auth":{getCurrentUser:async()=>({id:"owner"})},"../lib/cashier-activity":cashier,
   "../lib/active-business":{getActiveBusinessForUser:async()=>({id:active,ownerId:"owner",businessType:active===businessA?"WORKSHOP":"laundry"})},"../lib/db":{db:{$queryRaw:raw}}
  });
  const packages=packageExports.getAccountingPackages as (input:unknown)=>Promise<{ok:boolean;packages?:Array<{name:string}>;services?:Array<{name:string}>}>;
  const workshop=await packages({businessId:businessA});assert.equal(workshop.packages?.[0].name,"ورشة A");assert.equal(workshop.services?.length,1);assert.equal(workshop.services?.[0].name,"تغيير زيت المحرك");
  assert.equal((await packages({businessId:businessB})).ok,false);
  const orders=exports.getLaundryCustomerOrders as (input:unknown)=>Promise<{ok:boolean;orders?:Array<{total:number}>}>;
  const own=await orders({businessId:businessA,customerId:customerA});assert.equal(own.ok,true);assert.equal(own.orders?.[0].total,100);
  assert.equal((await orders({businessId:businessA,customerId:customerB})).orders?.length,0);
  const before=queries;assert.equal((await orders({businessId:businessB,customerId:customerB})).ok,false);assert.equal(queries,before);
  active=businessB;assert.equal((await packages({businessId:businessB})).services?.[0].name,"ثوب — غسيل وكوي");assert.equal((await packages({businessId:businessA})).ok,false);assert.equal((await orders({businessId:businessB,customerId:customerB})).orders?.[0].total,900);
  assert.equal((await orders({businessId:businessA,customerId:customerA})).ok,false);
 }finally{await pg.close();}
});
