import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Postgres migration enforces tenant binding, one open lease, bounded TTL and safe station reuse", async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE TABLE "Business" ("id" TEXT PRIMARY KEY); INSERT INTO "Business" VALUES (\'a\'), (\'b\');');
    await pg.exec(await readFile(new URL("../prisma/migrations/20261022160000_live_view/migration.sql",import.meta.url),"utf8"));
    await pg.exec(`INSERT INTO "LiveViewStation" ("id","businessId","name","location","streamKey","updatedAt") VALUES ('station-a','a','Lift','Branch','opaque',now());`);
    const insert = (id: string, business="a", ttl="1 hour") => pg.exec(`INSERT INTO "LiveViewSession" ("id","businessId","stationId","customerName","reference","tokenHash","createdAt","expiresAt") VALUES ('${id}','${business}','station-a','Customer','Job','${id}',TIMESTAMP '2026-10-22 12:00:00',TIMESTAMP '2026-10-22 12:00:00'+INTERVAL '${ttl}');`);
    await assert.rejects(insert("cross-tenant","b"), /foreign key/i);
    await assert.rejects(insert("too-long","a","25 hours"), /check constraint/i);
    await assert.rejects(insert("zero","a","0 hours"), /check constraint/i);
    await insert("first");
    await assert.rejects(insert("second"), /unique constraint/i);
    await pg.exec(`UPDATE "LiveViewSession" SET "endedAt"=now() WHERE "id"='first';`);
    await insert("second");
    const rows = await pg.query(`SELECT "id" FROM "LiveViewSession" WHERE "endedAt" IS NULL;`);
    assert.deepEqual(rows.rows,[{id:"second"}]);
    await assert.rejects(pg.exec(`DELETE FROM "Business" WHERE "id"='a'`), /foreign key/i);
  } finally { await pg.close(); }
});
