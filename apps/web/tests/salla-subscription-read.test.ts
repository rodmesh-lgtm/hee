import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { readBoundedJson } from "../app/lib/request-body";
import * as diagnostics from "../app/lib/commerce/salla-subscription-diagnostics";

type Module = typeof import("../app/lib/commerce/salla-subscription-read");
const binding = { businessId: "business-a", integrationId: "integration-a" };
const connectedAt = new Date("2026-10-29T08:00:00Z");
async function fixture(options: { foreign?: boolean; changed?: boolean; responses?: Response[] } = {}) {
  let lookups = 0, calls = 0, refreshes = 0;
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "../db": { db: { whatsAppCommerceIntegration: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      lookups++;
      assert.equal(where.businessId, binding.businessId);
      assert.equal(where.id, binding.integrationId);
      assert.equal(where.provider, "salla");
      assert.equal(where.status, "active");
      if (lookups > 1) { assert.equal(where.externalStoreId, "321"); assert.equal(where.connectedAt, connectedAt); }
      return options.foreign || (lookups > 1 && options.changed) ? null : { id: binding.integrationId, externalStoreId: "321", connectedAt };
    } } } },
    "./salla-config": { getSallaConfig: () => ({ SALLA_APP_ID: "123" }) },
    "./salla-access-token": { getSallaAccessToken: async (input: Record<string, unknown>) => {
      assert.equal(input.businessId, binding.businessId);
      if (input.rejectedAccessToken) refreshes++;
      return "PRIVATE_PROVIDER_TOKEN";
    } },
    "../request-body": { readBoundedJson },
    "./salla-subscription-diagnostics": diagnostics,
  };
  const source = await readFile(new URL("../app/lib/commerce/salla-subscription-read.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, Date, Error, AbortSignal,
    fetch: async (url: string, init: RequestInit) => {
      assert.equal(url, "https://api.salla.dev/admin/v2/apps/123/subscriptions");
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store");
      calls++;
      return options.responses?.shift() ?? Response.json({ success: true, data: [{ id: "123", item_type: "plan" }] });
    } });
  return { module: exports as Module, calls: () => calls, refreshes: () => refreshes };
}

test("subscription reads reject foreign bindings before sending credentials", async () => {
  const f = await fixture({ foreign: true });
  await assert.rejects(f.module.readSallaSubscription(binding), /SALLA_INTEGRATION_UNAVAILABLE/);
  assert.equal(f.calls(), 0);
});

test("disconnect or replacement while a subscription request is in flight invalidates its result", async () => {
  const f = await fixture({ changed: true });
  await assert.rejects(f.module.readSallaSubscription(binding), /SALLA_SUBSCRIPTION_CONNECTION_CHANGED/);
  assert.equal(f.calls(), 1);
});

test("401 refreshes once and a valid response is returned only for the current connection", async () => {
  const f = await fixture({ responses: [new Response(null, { status: 401 }), Response.json({ success: true, data: [] })] });
  const result = await f.module.readSallaSubscription(binding);
  assert.equal(result.subscriptions.length, 0);
  assert.equal(f.calls(), 2);
  assert.equal(f.refreshes(), 1);
});

test("404 diagnostic exposes only a fixed reason, not provider text, tokens or customer data", async () => {
  const f = await fixture({ responses: [Response.json({ error: { message: "The route admin/v2/apps/123/subscriptions could not be found. PRIVATE_CUSTOMER PRIVATE_PROVIDER_TOKEN" } }, { status: 404 })] });
  await assert.rejects(f.module.readSallaSubscription(binding), (error: unknown) => {
    assert.ok(error instanceof f.module.SallaSubscriptionReadError);
    assert.equal(error.providerStatus, 404);
    assert.equal(error.failureReason, "endpoint_not_found");
    assert.doesNotMatch(JSON.stringify(error), /PRIVATE_|admin\/v2/);
    return true;
  });
});

test("oversized or invalid successful provider bodies cannot become subscription evidence", async () => {
  for (const response of [Response.json({ success: true, data: [], padding: "x".repeat(70_000) }), new Response("not json"), Response.json({ success: true, data: {} })]) {
    const f = await fixture({ responses: [response] });
    await assert.rejects(f.module.readSallaSubscription(binding), /SALLA_SUBSCRIPTION_RESPONSE_INVALID/);
  }
});

test("diagnostics distinguish missing app/subscription/route without inventing a reason from a bare 404", () => {
  assert.equal(diagnostics.sallaSubscriptionFailureReason(404, { error: { message: "Application not found" } }), "app_not_found");
  assert.equal(diagnostics.sallaSubscriptionFailureReason(404, { message: "Subscription not found" }), "subscription_not_found");
  assert.equal(diagnostics.sallaSubscriptionFailureReason(404, { message: "Not found" }), "unclassified");
  assert.equal(diagnostics.sallaSubscriptionFailureReason(403, { message: "PRIVATE_DATA" }), "permission_denied");
  assert.equal(diagnostics.sallaSubscriptionFailureReason(429, null), "rate_limited");
  assert.equal(diagnostics.sallaSubscriptionFailureReason(500, { message: "Application not found" }), "unclassified");
});

test("customer guidance distinguishes provider causes without echoing arbitrary provider fields", () => {
 for(const reason of ["app_not_found","subscription_not_found","endpoint_not_found","permission_denied","rate_limited"]){
  assert.ok(diagnostics.sallaSubscriptionFailureMessage(reason,false));
  assert.ok(diagnostics.sallaSubscriptionFailureMessage(reason,true));
 }
 for(const reason of [null,{},"unclassified","PRIVATE_PROVIDER_TOKEN","__proto__"]){
  assert.equal(diagnostics.sallaSubscriptionFailureMessage(reason,false),null);
 }
 assert.match(diagnostics.sallaSubscriptionFailureMessage("endpoint_not_found",true)!,/service/);
 assert.match(diagnostics.sallaSubscriptionFailureMessage("subscription_not_found",true)!,/record/);
});

test("authenticated subscription API returns a safe actionable reason without provider payload", async () => {
  const f = await fixture();
  const source = await readFile(new URL("../app/api/commerce/salla/subscription/route.ts", import.meta.url), "utf8");
  const dependencies: Record<string, unknown> = {
    "../../../../lib/whatsapp/rbac": {getWhatsAppReadContext: async(permission: string) => {assert.equal(permission,"connection.manage"); return {businessId:"business-a",userId:"owner-a"};}},
    "../../../../lib/rate-limit": {consumePublicWriteLimit: async(input: {businessId: string}) => {assert.equal(input.businessId,"business-a");return {allowed:true};}},
    "../../../../lib/commerce/salla-subscription-read": {...f.module,readSallaSubscription: async(input: {businessId: string;integrationId: string}) => {
      assert.equal(input.businessId,"business-a");assert.equal(input.integrationId,"11111111-1111-4111-8111-111111111111");
      throw new f.module.SallaSubscriptionReadError("SALLA_SUBSCRIPTION_HTTP_404",404,undefined,"endpoint_not_found");
    }},
  };
  const exports: {GET?: (request: Request)=>Promise<Response>} = {};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:(id: string)=>{assert.ok(id in dependencies,id);return dependencies[id];},Response,URL,Error});
  const response=await exports.GET!(new Request("https://ir.sa/api/commerce/salla/subscription?store=11111111-1111-4111-8111-111111111111"));
  assert.equal(response.status,503);assert.equal(response.headers.get("cache-control"),"private, no-store");
  assert.deepEqual(await response.json(),{error:"SALLA_SUBSCRIPTION_HTTP_404",providerStatus:404,failureReason:"endpoint_not_found"});
});
