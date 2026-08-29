import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("production launch audit supports only fully configured OAuth providers", () => {
  const login = read("../app/login/page.tsx");
  const audit = read("../scripts/launch-config-audit.ts");

  assert.match(login, /href="\/api\/auth\/oauth\/google"/);
  assert.match(login, /href="\/api\/auth\/oauth\/apple"/);
  assert.match(audit, /function requireAllOrNone/);
  assert.match(audit, /GOOGLE_CLIENT_SECRET must be a valid distinct production secret/);
  assert.match(audit, /BEGIN PRIVATE KEY/);
  assert.match(audit, /productionOauthReadiness\(\)/);
});
