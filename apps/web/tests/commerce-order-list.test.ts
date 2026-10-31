import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { bookingDiagnosticPhone, bookingDiagnosticReason } from "../app/lib/commerce/booking-diagnostics";
function harness(authorized = true, fail = false) {
  const calls: Record<string, unknown>[] = [];
  const dependencies: Record<string, unknown> = {
    "../../../lib/whatsapp/rbac": { getWhatsAppReadContext: async () => authorized ? { businessId: "tenant-a" } : null },
    "../../../lib/commerce/booking-diagnostics": { bookingDiagnosticPhone, bookingDiagnosticReason },
    "../../../lib/db": { db: { commerceBookingEligibility: { findMany: async (input: Record<string, unknown>) => { calls.push(input); if (fail) throw new Error("PRIVATE_DATABASE_ERROR"); return [{ id: "record", externalOrderId: "123", provider: "salla", phoneE164: "+966501234567", paymentStatus: "paid", orderStatus: "in_progress", eligible: true, providerUpdatedAt: new Date("2026-10-31T10:00:00Z"), updatedAt: new Date("2026-10-31T11:00:00Z"), integration: { displayName: "Own store" } }]; } } } },
  };
  const exports = {};
  const source = readFileSync(new URL("../app/dashboard/commerce/orders/actions.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, FormData, Date });
  const run = async (fields: Record<string, string> = {}) => { const form = new FormData(); for (const [k, v] of Object.entries(fields)) form.set(k, v); return (exports as typeof import("../app/dashboard/commerce/orders/actions")).listStoreOrders({ code: "", page: 0, more: false, rows: [] }, form); };
  return { calls, run };
}
test("store order list refuses unauthorized requests before querying", async () => { const h = harness(false); assert.equal((await h.run()).code, "forbidden"); assert.equal(h.calls.length, 0); });
test("store order search constrains both record and integration to current tenant", async () => { const h = harness(); const result = await h.run({ query: "0501234567", provider: "salla" }); const input = h.calls[0]; const where = input.where as { businessId: string; integration: { businessId: string; status: string }; OR: object[] }; assert.equal(where.businessId, "tenant-a"); assert.equal(where.integration.businessId, "tenant-a"); assert.equal(where.integration.status, "active"); assert.match(JSON.stringify(where.OR), /\+966501234567/); assert.equal(result.rows[0].id, "123"); assert.equal(result.rows[0].reason, "eligible"); assert.equal(input.take, 26); assert.doesNotMatch(JSON.stringify(input.select), /credential|payload|token/); });
test("invalid provider never reaches database and pagination is bounded", async () => { const h = harness(); assert.equal((await h.run({ provider: "foreign" })).code, "invalid"); assert.equal(h.calls.length, 0); await h.run({ page: "999999" }); assert.equal(h.calls[0].skip, 5000); });
test("database errors are not presented as an empty order history", async () => { const h = harness(true, true); const result = await h.run(); assert.equal(result.code, "unavailable"); assert.equal(result.rows.length, 0); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_DATABASE_ERROR/); });
