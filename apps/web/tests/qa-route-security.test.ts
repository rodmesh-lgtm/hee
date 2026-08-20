import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/qa/dashboard-audit/route";

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
