import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("receipt query keeps balances at ticket redemption, includes exhausted units and isolates businesses",async()=>{
 const db=new PGlite();
 try {
 await db.exec(`
 CREATE TABLE "LaundryTicket" (id text,"businessId" text,number int,"customerId" text,"customerName" text,phone text,items jsonb,total int,paid int,status text,"dueAt" timestamptz,notes text,"createdAt" timestamptz);
 CREATE TABLE "LaundryPayment" (id text,"businessId" text,"ticketId" text,method text,amount int);
 CREATE TABLE "LaundryPrepaid" (id text,"businessId" text,"customerId" text,name text,kind text,amount int,"unitsIncluded" int,"createdAt" timestamptz DEFAULT '2026-10-01',"startsAt" timestamptz DEFAULT '2026-10-01',"expiresAt" timestamptz DEFAULT '2026-11-01');
 CREATE TABLE "LaundryPrepaidMovement" (id text,"businessId" text,"prepaidId" text,"paymentId" text,kind text,amount int,units int,"createdAt" timestamptz);
 INSERT INTO "LaundryTicket" VALUES ('ticket','shop',1,'customer','Customer','0500000000','[]',600,600,'received',now(),'','2026-10-24T06:00Z');
 INSERT INTO "LaundryPayment" VALUES ('cash-use','shop','ticket','prepaid',400),('piece-use','shop','ticket','prepaid',200),('foreign-pay','other','ticket','prepaid',800);
 INSERT INTO "LaundryPrepaid" (id,"businessId","customerId",name,kind,amount,"unitsIncluded") VALUES ('credit','shop','customer','Monthly credit','credit',1000,NULL),('pieces','shop','customer','Two pieces','pieces',200,2),('foreign','other','customer','Private','credit',900,NULL);
 INSERT INTO "LaundryTicket" VALUES ('regular','shop',2,'nonmember','Regular customer','0500000001','[]',500,0,'received',now(),'','2026-10-24T06:00Z');
 INSERT INTO "LaundryTicket" VALUES ('cash-ticket','shop',3,'member','Cash invoice','0500000002','[]',500,500,'received',now(),'','2026-10-24T06:00Z');
 INSERT INTO "LaundryPrepaid" (id,"businessId","customerId",name,kind,amount,"unitsIncluded") VALUES ('unused','shop','member','Unused credit','credit',1500,NULL);
 INSERT INTO "LaundryPrepaid" (id,"businessId","customerId",name,kind,amount,"unitsIncluded","createdAt","startsAt","expiresAt") VALUES ('future','shop','member','Future credit','credit',900,NULL,'2026-10-25','2026-10-25','2026-12-01'),('expired','shop','member','Expired credit','credit',900,NULL,'2026-09-01','2026-09-01','2026-10-01');
 INSERT INTO "LaundryPrepaidMovement" VALUES
 ('m1','shop','credit','cash-use','redeem',400,0,'2026-10-24T06:00Z'),
 ('m2','shop','credit',NULL,'redeem',300,0,'2026-10-24T07:00Z'),
 ('m3','shop','pieces','piece-use','redeem',200,2,'2026-10-24T06:00Z'),
 ('m4','other','foreign','foreign-pay','redeem',800,0,'2026-10-24T06:00Z');
 `);
 const source=await readFile(new URL("../app/Laundromat/server-workspace.tsx",import.meta.url),"utf8");
 const template=source.match(/db\.\$queryRaw<LaundryTicket\[\]>`([\s\S]*?)`/)![1];
 const values:Record<string,string>={"business.id":"shop",pattern:"%",q:"",filter:"all",normalizedPhone:"",'normalizedPhone.replace(/^\\+/,"")':"",localPhone:""};
 const parameters:string[]=[];
 const sql=template.replace(/\$\{([^}]+)\}/g,(_,key:string)=>{assert.ok(key in values,key);parameters.push(values[key]);return `$${parameters.length}`;});
 const result=await db.query<{id:string;subscriptionBalances:Array<{id:string;originalAmount:number;usedAmount:number;remaining:number;unitsRemaining:number|null}>}>(sql,parameters);
 assert.equal(result.rows.length,3);
 assert.deepEqual(result.rows.find(t=>t.id==="regular")?.subscriptionBalances,[]);
 assert.deepEqual(result.rows.find(t=>t.id==="cash-ticket")?.subscriptionBalances.map(s=>({id:s.id,originalAmount:s.originalAmount,usedAmount:s.usedAmount,remaining:s.remaining})),[{id:"unused",originalAmount:1500,usedAmount:0,remaining:1500}]);
 assert.deepEqual(result.rows.find(t=>t.id==="ticket")!.subscriptionBalances.map(s=>({id:s.id,originalAmount:s.originalAmount,usedAmount:s.usedAmount,remaining:s.remaining,unitsRemaining:s.unitsRemaining})),[
 {id:"credit",originalAmount:1000,usedAmount:400,remaining:600,unitsRemaining:null},{id:"pieces",originalAmount:200,usedAmount:200,remaining:0,unitsRemaining:0}
 ]);
 // A manual later redemption on this same ticket updates the receipt cutoff.
 await db.exec(`INSERT INTO "LaundryPayment" VALUES ('later','shop','ticket','prepaid',100); INSERT INTO "LaundryPrepaidMovement" VALUES ('m5','shop','credit','later','redeem',100,0,'2026-10-24T08:00Z')`);
 const later=await db.query<{id:string;subscriptionBalances:Array<{id:string;originalAmount:number;usedAmount:number;remaining:number}>}>(sql,parameters);
 const credit=later.rows.find(t=>t.id==="ticket")!.subscriptionBalances.find(s=>s.id==="credit")!;
 assert.equal(credit.remaining,200);
 assert.equal(credit.usedAmount,500);
 assert.equal(credit.originalAmount,1000);
 } finally { await db.close(); }
});
