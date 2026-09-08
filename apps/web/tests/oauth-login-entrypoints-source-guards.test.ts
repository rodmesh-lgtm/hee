import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("login page retains supported OAuth entry points and server routes fail closed when disabled", () => {
  const page = source("app/login/page.tsx");
  const client = source("app/login/login-content.tsx");
  const oauth = source("app/lib/oauth.ts");
  assert.match(page, /providerConfigured\("google"\)/);
  assert.match(page, /providerConfigured\("apple"\)/);
  assert.match(client, /href="\/api\/auth\/oauth\/google"/);
  assert.match(client, /href="\/api\/auth\/oauth\/apple"/);
  assert.match(client, /المتابعة باستخدام Google/);
  assert.match(client, /المتابعة باستخدام Apple/);
  assert.match(client, /googleEnabled \?/);
  assert.match(client, /appleEnabled \?/);
  assert.match(oauth, /export function providerConfigured/);
  assert.match(oauth, /if \(!providerConfigured\(provider\)\)/);
});

test("OAuth registration requires explicit Terms and Privacy consent", () => {
  const route = source("app/api/auth/oauth/[provider]/route.ts");
  const register = source("app/register/page.tsx");
  assert.match(route, /value === "google" \|\| value === "apple"/);
  assert.match(route, /searchParams\.get\("mode"\) === "register"/);
  assert.match(route, /searchParams\.get\("consent"\) !== "accepted"/);
  assert.match(route, /\/register\?oauth=consent-required/);
  assert.match(route, /registration \? "\/onboarding" : "\/dashboard"/);
  assert.match(register, /mode=register&consent=accepted/);
  assert.match(register, /المتابعة باستخدام Google/);
  assert.match(register, /المتابعة باستخدام Apple/);
  assert.match(register, /الشروط والأحكام/);
  assert.match(register, /سياسة الخصوصية/);
});

test("login page renders safe user-facing OAuth failure feedback", () => {
  const client = source("app/login/login-content.tsx");
  assert.match(client, /searchParams\.get\("oauth"\)/);
  assert.match(client, /provider-unavailable/);
  assert.match(client, /account-link-required/);
  assert.match(client, /role="alert"/);
});
