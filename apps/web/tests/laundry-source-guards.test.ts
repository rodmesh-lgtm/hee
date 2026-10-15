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
