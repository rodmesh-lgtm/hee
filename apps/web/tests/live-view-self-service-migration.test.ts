import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("connector schema binds cameras to the tenant and consumes pairing codes once",async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(`CREATE TABLE "Business" ("id" TEXT PRIMARY KEY); INSERT INTO "Business" VALUES ('a'),('b');`);
    for(const name of ["20261022160000_live_view","20261022180000_live_view_self_service"])await pg.exec(await readFile(new URL(`../prisma/migrations/${name}/migration.sql`,import.meta.url),"utf8"));
    await pg.exec(`INSERT INTO "LiveViewConnector" ("id","businessId","name","pairingHash","pairingExpiresAt","updatedAt") VALUES ('bridge-a','a','Site','pair',now()+interval '10 minutes',now()),('bridge-b','b','Other','other',now()+interval '10 minutes',now());`);
    await pg.exec(`INSERT INTO "LiveViewStation" ("id","businessId","name","location","streamKey","connectorId","updatedAt") VALUES ('station-a','a','Camera','Site','stream','bridge-a',now());`);
    await assert.rejects(pg.exec(`UPDATE "LiveViewStation" SET "connectorId"='bridge-b' WHERE "id"='station-a'`),/foreign key/i);
    const enroll=()=>pg.query(`UPDATE "LiveViewConnector" SET "tokenHash"='token',"pairingHash"=NULL,"enrolledAt"=now() WHERE "pairingHash"='pair' AND "tokenHash" IS NULL AND "pairingExpiresAt">now() RETURNING "id";`);
    const attempts=await Promise.all([enroll(),enroll()]);assert.equal(attempts.reduce((sum,r)=>sum+r.rows.length,0),1);
    await pg.exec(`UPDATE "LiveViewStation" SET "configVersion"=2,"probeNonce"='new' WHERE "id"='station-a';`);
    const stale=await pg.query(`UPDATE "LiveViewStation" SET "lastOnline"=true WHERE "id"='station-a' AND "connectorId"='bridge-a' AND "configVersion"=1 AND "probeNonce"='old' RETURNING "id";`);
    assert.equal(stale.rows.length,0);
    const cross=await pg.query(`SELECT * FROM "LiveViewStation" WHERE "id"='station-a' AND "businessId"='b';`);assert.equal(cross.rows.length,0);
    await pg.exec(`UPDATE "LiveViewConnector" SET "tokenHash"=NULL,"revokedAt"=now() WHERE "id"='bridge-a';`);
    assert.equal((await pg.query(`SELECT * FROM "LiveViewConnector" WHERE "tokenHash"='token' AND "revokedAt" IS NULL;`)).rows.length,0);
  }finally{await pg.close();}
});
