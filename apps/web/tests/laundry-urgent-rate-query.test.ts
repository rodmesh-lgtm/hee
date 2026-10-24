import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("catalog query joins tenant-specific urgent rates without exposing variants as products",async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE TABLE "LaundryService" (id text PRIMARY KEY,"businessId" text,name text,category text,price int,active boolean DEFAULT true);
 INSERT INTO "LaundryService" VALUES ('wash','a','Wash','Laundry',1000,true),('iron','a','Iron','Laundry',500,true),('urgent:wash','a','Urgent wash','Laundry',1500,true),('foreign','b','Other shop','Laundry',100,true),('urgent:iron','b','Cross-tenant invalid rate','Laundry',900,true);`);
 const source=await readFile(new URL("../app/Laundromat/server-workspace.tsx",import.meta.url),"utf8");
 const query=source.match(/db\.\$queryRaw<LaundryService\[\]>`([\s\S]*?)`/)![1].replace(/\$\{business.id\}/g,"$1");
 const rows=(await db.query<{id:string;urgentPrice:number|null}>(query,["a"])).rows;
 assert.equal(rows.length,2);
 assert.equal(rows.find(r=>r.id==="wash")?.urgentPrice,1500);
 assert.equal(rows.find(r=>r.id==="iron")?.urgentPrice,null);
 assert.ok(rows.every(r=>!r.id.startsWith("urgent:")));
 await db.exec(`UPDATE "LaundryService" SET active=false WHERE id='urgent:wash'`);
 assert.equal((await db.query<{id:string;urgentPrice:number|null}>(query,["a"])).rows.find(r=>r.id==="wash")?.urgentPrice,null);
 } finally {await db.close();}
});
