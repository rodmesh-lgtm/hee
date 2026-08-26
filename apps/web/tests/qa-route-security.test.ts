import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GET, POST } from "../app/api/qa/dashboard-audit/route";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function withPreviewQaEnv<T>(fn: () => Promise<T>) {
  const previous = {
    env: process.env.VERCEL_ENV,
    secret: process.env.QA_AUDIT_SECRET,
    email: process.env.QA_AUDIT_USER_EMAIL,
  };
  process.env.VERCEL_ENV = "preview";
  process.env.QA_AUDIT_SECRET = "qa-master-secret";
  process.env.QA_AUDIT_USER_EMAIL = "qa@example.com";

  return fn().finally(() => {
    if (previous.env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous.env;
    if (previous.secret === undefined) delete process.env.QA_AUDIT_SECRET; else process.env.QA_AUDIT_SECRET = previous.secret;
    if (previous.email === undefined) delete process.env.QA_AUDIT_USER_EMAIL; else process.env.QA_AUDIT_USER_EMAIL = previous.email;
  });
}

test("QA dashboard GET never accepts the master secret from a query string", async () => {
  await withPreviewQaEnv(async () => {
    const response = await GET(new Request("https://preview.example/api/qa/dashboard-audit?token=qa-master-secret"));
    assert.equal(response.status, 404);
  });
});

test("QA dashboard POST rejects query-string credentials before session checks", async () => {
  await withPreviewQaEnv(async () => {
    const response = await POST(new Request("https://preview.example/api/qa/dashboard-audit?token=qa-master-secret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/dashboard" }),
    }));
    assert.equal(response.status, 404);
  });
});

test("Production QA pages are blocked independently by the edge proxy and server layout", () => {
  const proxy = source("proxy.ts");
  const layout = source("app/qa/layout.tsx");

  assert.match(proxy, /const appEnv = String\(process\.env\.APP_ENV/);
  assert.match(proxy, /const vercelEnv = String\(process\.env\.VERCEL_ENV/);
  assert.match(proxy, /appEnv === "production" \|\| vercelEnv === "production"/);
  assert.match(proxy, /pathname === "\/qa" \|\| pathname\.startsWith\("\/qa\/"\)/);
  assert.match(proxy, /productionQaNotFoundResponse\(\)/);

  assert.match(layout, /process\.env\.APP_ENV/);
  assert.match(layout, /process\.env\.VERCEL_ENV/);
  assert.match(layout, /appEnv === "production" \|\| vercelEnv === "production"/);
  assert.match(layout, /if \(isProductionRuntime\(\)\) notFound\(\)/);
});
