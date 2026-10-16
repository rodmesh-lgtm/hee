import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const actions=readFileSync("app/Laundromat/actions.ts","utf8");
const migration=readFileSync("prisma/migrations/20261015190000_laundry_workspace/migration.sql","utf8");
test("laundry mutations authenticate, authorize the section, reject stale workspace, serialize and audit",()=>{
 for(const boundary of ["getCurrentUserForApiWrite()",'getActiveBusinessForUser(user.id,"laundry")',"scope.data.businessId!==business.id","business.ownerId !== user.id","pg_advisory_xact_lock","laundryLines(data.items,catalog)",'INSERT INTO "LaundryAudit"'])assert.ok(actions.includes(boundary),boundary);
 assert.match(actions,/paid>total/);assert.match(actions,/amount>ticket.total-ticket.paid/);
 assert.match(actions,/WHERE "id"=\$\{id\} AND "businessId"=\$\{business.id\} FOR UPDATE/);
});
test("laundry persistence has tenant uniqueness, composite foreign keys and monetary constraints",()=>{
 assert.ok(migration.includes('UNIQUE ("businessId","requestId")'));
 assert.ok(migration.includes('FOREIGN KEY ("businessId","ticketId")'));
 assert.ok(migration.includes('"paid" <= "total"'));
 assert.ok(migration.includes('UNIQUE ("businessId","number")'));
});
test("preset activation is owner-only, transactional, tenant-scoped and idempotent",()=>{
 assert.ok(actions.includes('["service","catalog","product","archive","expense"]'));
 assert.ok(actions.includes('resolveLaundryPreset(item.presetId,item.operation??"")'));
 assert.ok(actions.includes('"businessId"=${business.id} AND "id"=${id} AND "action"=${data.type}'));
 assert.ok(actions.includes('WHERE NOT EXISTS (SELECT 1 FROM "LaundryService" s WHERE s."businessId"=${business.id}'));
 assert.ok(actions.includes('jsonb_to_recordset(${JSON.stringify(presets)}::jsonb)'));
 assert.ok(actions.includes('if(price<=0)'));
});
