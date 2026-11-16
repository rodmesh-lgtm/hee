import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('optional delivery migration preserves appointments and excludes unscheduled orders from overdue',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`CREATE TABLE "LaundryTicket"(id text,"dueAt" timestamptz NOT NULL); INSERT INTO "LaundryTicket" VALUES ('scheduled','2026-01-01T12:00:00Z');`);
  await pg.exec(readFileSync('prisma/migrations/20261116150000_optional_cashier_delivery/migration.sql','utf8'));
  await pg.exec(`INSERT INTO "LaundryTicket" VALUES ('unscheduled',NULL)`);
  const rows=await pg.query<{id:string}>(`SELECT id FROM "LaundryTicket" WHERE "dueAt"<'2026-11-16T00:00:00Z'`);
  assert.deepEqual(rows.rows,[{id:'scheduled'}]);
  assert.equal((await pg.query<{dueAt:Date}>(`SELECT "dueAt" FROM "LaundryTicket" WHERE id='scheduled'`)).rows[0].dueAt.toISOString(),'2026-01-01T12:00:00.000Z');
 }finally{await pg.close();}
});
