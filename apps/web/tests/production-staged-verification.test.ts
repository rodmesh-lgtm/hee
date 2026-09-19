import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const script = pathToFileURL(resolve(process.cwd(), "../../.github/scripts/verify-staged-vercel-production.mjs")).href;
const sha = "a".repeat(40);
const secret = "test-automation-secret";
const config = { deploymentUrl: "https://owned.vercel.app", projectId: "prj_expected", teamId: "team_expected", releaseSha: sha, token: "test-api-token" };

function fixture(overrides: Record<string, unknown> = {}, existingSecret = true) {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const responses: Record<string, unknown> = {
    "/v13/deployments/owned.vercel.app": { projectId: config.projectId, state: "READY", target: "production", url: "owned.vercel.app" },
    "/v9/projects/prj_expected": { id: config.projectId, accountId: config.teamId, protectionBypass: existingSecret ? { [secret]: { scope: "automation-bypass" } } : {} },
    "/v1/projects/prj_expected/protection-bypass": { protectionBypass: { [secret]: { scope: "automation-bypass" } } },
    "/api/release": { releaseSha: sha, environment: "production" },
    "/api/maintenance/status": { releaseSha: sha, environment: "production", maintenance: false },
    "/api/health/web-ready": { ready: true },
    "/api/auth/oauth/google": new Response(null, { status: 307, headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=client.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fir.sa%2Fapi%2Fauth%2Foauth%2Fgoogle%2Fcallback&response_type=code&code_challenge_method=S256&state=state&nonce=nonce" } }),
    ...overrides,
  };
  const fetchImpl = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    assert.equal(init.redirect, "manual", "credentials must not follow redirects");
    const headers = new Headers(init.headers);
    if (url.hostname === "api.vercel.com") {
      assert.equal(headers.get("authorization"), `Bearer ${config.token}`);
      assert.equal(headers.get("x-vercel-protection-bypass"), null);
      assert.equal(url.searchParams.get("teamId"), config.teamId);
    } else {
      assert.equal(url.origin, config.deploymentUrl, "credential must stay on verified stage");
      assert.equal(headers.get("authorization"), null);
      assert.equal(headers.get("x-vercel-protection-bypass"), secret);
    }
    const value = responses[url.pathname];
    return value instanceof Response ? value : Response.json(value ?? { ok: true });
  };
  return { calls, fetchImpl, wait: async () => {} };
}

test("authenticated stage checks reuse the project credential and verify all customer surfaces", async () => {
  const { verifyStagedProduction } = await import(script);
  const mock = fixture();
  await verifyStagedProduction({ ...config, ...mock });
  assert.equal(mock.calls.length, 13);
  assert.ok(mock.calls.every(call => call.init.method !== "PATCH"));
  assert.deepEqual(mock.calls.filter(call => call.url.hostname === "owned.vercel.app").map(call => call.url.pathname), ["/api/release", "/api/maintenance/status", "/api/health/web-ready", "/api/auth/oauth/google", "/", "/register", "/login", "/terms", "/privacy", "/contact", "/demo"]);
});

test("missing automation credential is created through the official project endpoint only", async () => {
  const { verifyStagedProduction } = await import(script);
  const mock = fixture({}, false);
  await verifyStagedProduction({ ...config, ...mock });
  const changes = mock.calls.filter(call => call.init.method === "PATCH");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].url.pathname, "/v1/projects/prj_expected/protection-bypass");
  assert.deepEqual(JSON.parse(String(changes[0].init.body)), { generate: { note: "GitHub production readiness checks" } });
});

test("authenticated maintenance checks prove UI and write blocking without weakening deployment protection", async () => {
  const { verifyStagedProduction } = await import(script);
  const body = "<html><title>INFRO — صيانة مجدولة</title></html>";
  const mock = fixture({
    "/api/maintenance/status": { releaseSha: sha, environment: "production", maintenance: true },
    "/register": new Response(body, { status: 503, headers: { "content-type": "text/html" } }),
    "/api/public/orders": new Response(body, { status: 503, headers: { "content-type": "text/html" } }),
  });
  await verifyStagedProduction({ ...config, ...mock, expectedMaintenance: true });
  assert.equal(mock.calls.length, 6);
  assert.deepEqual(mock.calls.filter(call => call.url.hostname === "owned.vercel.app").map(call => call.url.pathname), ["/api/release", "/api/maintenance/status", "/register", "/api/public/orders"]);
  const write = mock.calls.at(-1);
  assert.equal(write?.init.method, "POST");
  assert.equal(new Headers(write?.init.headers).get("content-type"), "application/json");
  assert.equal(write?.init.body, "{}");
});

test("foreign URLs fail before any credential leaves the process", async () => {
  const { verifyStagedProduction } = await import(script);
  for (const deploymentUrl of ["https://external.example", "https://owned.vercel.app@external.example", "http://owned.vercel.app", "https://owned.vercel.app/?redirect=external"]) {
    const mock = fixture();
    await assert.rejects(verifyStagedProduction({ ...config, ...mock, deploymentUrl }), /Invalid staged/);
    assert.equal(mock.calls.length, 0);
  }
});

test("wrong project, team, readiness and target fail before automation access", async () => {
  const { verifyStagedProduction } = await import(script);
  for (const changes of [{ projectId: "other" }, { state: "BUILDING" }, { target: "preview" }, { url: "different.vercel.app" }]) {
    const mock = fixture({ "/v13/deployments/owned.vercel.app": { projectId: config.projectId, state: "READY", target: "production", url: "owned.vercel.app", ...changes } });
    await assert.rejects(verifyStagedProduction({ ...config, ...mock }), /identity or readiness mismatch/);
    assert.equal(mock.calls.length, 1);
  }
  const mock = fixture({ "/v9/projects/prj_expected": { id: config.projectId, accountId: "other" } });
  await assert.rejects(verifyStagedProduction({ ...config, ...mock }), /Unexpected Vercel project or team/);
  assert.equal(mock.calls.length, 2);
});

test("release mismatch, maintenance and unhealthy runtime prevent stage success", async () => {
  const { verifyStagedProduction } = await import(script);
  for (const overrides of [
    { "/api/release": { releaseSha: "b".repeat(40), environment: "production" } },
    { "/api/maintenance/status": { releaseSha: sha, environment: "production", maintenance: true } },
    { "/api/health/web-ready": { ready: false } },
  ]) {
    const mock = fixture(overrides);
    await assert.rejects(verifyStagedProduction({ ...config, ...mock }));
    assert.equal(mock.calls.length, 5, "do not proceed to surface checks after failed readiness");
  }
});

test("missing or malformed Google OAuth runtime configuration blocks promotion", async () => {
  const { verifyStagedProduction } = await import(script);
  for (const response of [
    new Response(null, { status: 307, headers: { location: "https://ir.sa/register?oauth=provider-unavailable" } }),
    new Response(null, { status: 307, headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=bad&redirect_uri=https%3A%2F%2Fevil.example%2Fcallback" } }),
    new Response(null, { status: 500 }),
  ]) {
    const mock = fixture({ "/api/auth/oauth/google": response });
    await assert.rejects(verifyStagedProduction({ ...config, ...mock }), /Google OAuth/);
    assert.equal(mock.calls.at(-1)?.url.pathname, "/api/auth/oauth/google");
  }
});

test("redirects, non-JSON responses and API permission errors fail closed without exposing response bodies", async () => {
  const { verifyStagedProduction } = await import(script);
  for (const [path, response] of [
    ["/api/release", new Response(secret, { status: 302, headers: { location: "https://external.example" } })],
    ["/api/release", new Response(secret, { status: 200, headers: { "content-type": "text/html" } })],
    ["/v9/projects/prj_expected", new Response(secret, { status: 403 })],
    ["/register", new Response(secret, { status: 500 })],
  ] as const) {
    const mock = fixture({ [path]: response });
    await assert.rejects(verifyStagedProduction({ ...config, ...mock }), (error: Error) => {
      assert.ok(!error.message.includes(secret));
      return true;
    });
    assert.equal(mock.calls.at(-1)?.url.pathname, path);
  }
});
