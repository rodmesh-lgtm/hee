import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("production launch audit supports only fully configured OAuth providers", () => {
  const page = read("../app/login/page.tsx");
  const client = read("../app/login/login-content.tsx");
  const audit = read("../scripts/launch-config-audit.ts");

  assert.match(page, /providerConfigured\("google"\)/);
  assert.match(page, /providerConfigured\("apple"\)/);
  assert.match(client, /href="\/api\/auth\/oauth\/google"/);
  assert.match(client, /href="\/api\/auth\/oauth\/apple"/);
  assert.match(client, /googleEnabled \?/);
  assert.match(client, /appleEnabled \?/);
  assert.match(audit, /function requireAllOrNone/);
  assert.match(audit, /GOOGLE_CLIENT_SECRET must be a valid distinct production secret/);
  assert.match(audit, /BEGIN PRIVATE KEY/);
  assert.match(audit, /productionOauthReadiness\(\)/);
});
