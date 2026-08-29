import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("login page retains supported OAuth entry points and server routes fail closed when disabled", () => {
  const login = source("app/login/page.tsx");
  const oauth = source("app/lib/oauth.ts");
  assert.match(login, /href="\/api\/auth\/oauth\/google"/);
  assert.match(login, /href="\/api\/auth\/oauth\/apple"/);
  assert.match(login, /المتابعة باستخدام Google/);
  assert.match(login, /المتابعة باستخدام Apple/);
  assert.match(oauth, /export function providerConfigured/);
  assert.match(oauth, /if \(!providerConfigured\(provider\)\)/);
});

test("OAuth start route remains login-only until consent-aware social registration exists", () => {
  const route = source("app/api/auth/oauth/[provider]/route.ts");
  assert.match(route, /value === "google" \|\| value === "apple"/);
  assert.match(route, /searchParams\.get\("mode"\) === "register"/);
  assert.match(route, /\/register\?oauth=consent-required/);
});

test("login page renders safe user-facing OAuth failure feedback", () => {
  const login = source("app/login/page.tsx");
  assert.match(login, /searchParams\.get\("oauth"\)/);
  assert.match(login, /provider-unavailable/);
  assert.match(login, /account-link-required/);
  assert.match(login, /role="alert"/);
});
