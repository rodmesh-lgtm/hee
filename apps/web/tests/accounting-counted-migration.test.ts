import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("counted migration preserves existing credit and rejects incomplete or negative unit balances",async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE TABLE "AccountingPackage" (id TEXT,amount INTEGER,"serviceIds" JSONB);
 CREATE TABLE "LaundryPrepaid" (id TEXT,remaining INTEGER,"serviceIds" JSONB);
 CREATE TABLE "LaundryPrepaidMovement" (id TEXT);
 INSERT INTO "LaundryPrepaid" VALUES ('legacy',1234,'[]');`);
 await db.exec(readFileSync("prisma/migrations/20261023090000_accounting_counted_packages/migration.sql","utf8"));
 assert.deepEqual((await db.query(`SELECT remaining,kind,"unitsRemaining" FROM "LaundryPrepaid"`)).rows,[{remaining:1234,kind:"credit",unitsRemaining:null}]);
 await db.exec(`INSERT INTO "AccountingPackage" VALUES ('valid',1000,'["service"]','pieces',3);
 INSERT INTO "LaundryPrepaid" VALUES ('valid',1000,'["service"]','pieces',3,3);`);
 for(const sql of [
 `INSERT INTO "AccountingPackage" VALUES ('bad',1000,'["service"]','pieces',NULL)`,
 `INSERT INTO "AccountingPackage" VALUES ('bad',1000,'[]','pieces',3)`,
 `INSERT INTO "LaundryPrepaid" VALUES ('bad',1000,'["service"]','visits',3,NULL)`,
 `UPDATE "LaundryPrepaid" SET "unitsRemaining"=-1 WHERE id='valid'`,
 `UPDATE "LaundryPrepaid" SET remaining=1 WHERE id='valid'`,
 `UPDATE "LaundryPrepaid" SET "unitsRemaining"=0 WHERE id='valid'`,
 ])await assert.rejects(db.exec(sql));
 await db.exec(`UPDATE "LaundryPrepaid" SET remaining=0,"unitsRemaining"=0 WHERE id='valid'`);
 }finally{await db.close();}
});
