import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as diagnostics from "../app/lib/commerce/booking-diagnostics";

test("diagnostic phone matches Saudi local and international formats", () => {
  for (const phone of ["0501234567", "501234567", "+966501234567", "966501234567", "٠٥٠١٢٣٤٥٦٧"]) assert.equal(diagnostics.bookingDiagnosticPhone(phone), "+966501234567");
  assert.equal(diagnostics.bookingDiagnosticPhone("not a phone"), null);
});
test("missing payment evidence stays unknown rather than being called unpaid", () => {
  assert.equal(diagnostics.bookingDiagnosticReason({ eligible: false, phoneE164: "+966501234567", paymentStatus: null, orderStatus: "completed" }), "payment_unknown");
  assert.equal(diagnostics.bookingDiagnosticReason({ eligible: false, phoneE164: "+966501234567", paymentStatus: "paid", orderStatus: "refunded" }), "order_revoked");
});
function fixture(options: { forbidden?: boolean; changed?: boolean; eligible?: boolean; absent?: boolean; syncFail?: boolean } = {}) {
  const calls: string[] = [];
  const dependencies: Record<string, unknown> = {
    "../../../lib/whatsapp/rbac": { getWhatsAppWriteContext: async () => options.forbidden ? null : { businessId: "a", userId: "user-a" } },
    "../../../lib/rate-limit": { consumePublicWriteLimit: async () => ({ allowed: true }) },
    "../../../lib/commerce/booking-diagnostics": diagnostics,
    "../../../lib/subscription-entitlement": { hasActiveBusinessSubscription: async () => true },
    "../../../lib/commerce/salla-order-sync": { syncSallaBookingOrders: async (input: { businessId: string }) => { assert.equal(input.businessId, "a"); calls.push("sync"); if (options.syncFail) throw new Error("PRIVATE_ERROR"); } },
    "../../../lib/db": { db: {
      whatsAppCommerceIntegration: { findFirst: async ({ where }: { where: Record<string, unknown> }) => { assert.equal(where.businessId, "a"); if (where.id && options.changed) return null; return { id: "store-a", connectedAt: new Date(0) }; } },
      commerceBookingEligibility: { findMany: async ({ where }: { where: { businessId: string; integrationId: string; phoneE164: string; integration: { businessId: string } } }) => {
        calls.push("read"); assert.equal(where.businessId, "a"); assert.equal(where.integrationId, "store-a"); assert.equal(where.integration.businessId, "a"); assert.equal(where.phoneE164, "+966501234567");
        return options.absent ? [] : [{ eligible: options.eligible ?? false, phoneE164: where.phoneE164, paymentStatus: null, orderStatus: "completed" }];
      } },
    } },
  };
  const exports = {};
  const source = readFileSync(new URL("../app/dashboard/commerce/salla/booking-check-action.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Error, require: (id: string) => { assert.ok(id in dependencies); return dependencies[id]; } });
  return { calls, run: async (refresh = false) => { const form = new FormData(); form.set("phone", "0501234567"); if (refresh) form.set("refresh", "yes"); return (exports as typeof import("../app/dashboard/commerce/salla/booking-check-action")).checkSallaBooking({ code: "" }, form); } };
}
test("unauthorized diagnostic does not query customer records", async () => { const f=fixture({forbidden:true}); assert.equal((await f.run()).code,"forbidden"); assert.equal(f.calls.length,0); });
test("diagnostic is tenant scoped and returns reasons without customer data", async () => { const f=fixture(); const r=await f.run(); assert.equal(r.code,"ineligible"); assert.equal(r.reasons?.[0],"payment_unknown"); assert.doesNotMatch(JSON.stringify(r),/501234567|completed|store-a/); });
test("connection changes invalidate diagnosis", async () => { assert.equal((await fixture({changed:true}).run()).code,"connection_changed"); });
test("missing order is distinguished from a known ineligible order", async () => { assert.equal((await fixture({absent:true}).run()).code,"not_found"); });
test("sync failure cannot produce an eligible result", async () => { const f=fixture({syncFail:true,eligible:true}); assert.equal((await f.run(true)).code,"unavailable"); assert.deepEqual(f.calls,["sync"]); });
test("successful refreshed check reads records after sync", async () => { const f=fixture({eligible:true}); assert.equal((await f.run(true)).code,"eligible"); assert.deepEqual(f.calls,["sync","read"]); });
