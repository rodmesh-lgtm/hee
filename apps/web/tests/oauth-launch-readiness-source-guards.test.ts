import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("production launch audit requires every OAuth provider exposed on login", () => {
  const login = read("../app/login/page.tsx");
  const audit = read("../scripts/launch-config-audit.ts");

  assert.match(login, /href="\/api\/auth\/oauth\/google"/);
  assert.match(login, /href="\/api\/auth\/oauth\/apple"/);
  assert.match(audit, /required\("GOOGLE_CLIENT_ID"\)/);
  assert.match(audit, /strongSecret\("GOOGLE_CLIENT_SECRET", 16\)/);
  assert.match(audit, /required\("APPLE_CLIENT_ID"\)/);
  assert.match(audit, /required\("APPLE_TEAM_ID"\)/);
  assert.match(audit, /required\("APPLE_KEY_ID"\)/);
  assert.match(audit, /required\("APPLE_PRIVATE_KEY"\)/);
  assert.match(audit, /BEGIN PRIVATE KEY/);
  assert.match(audit, /productionOauthReadiness\(\)/);
});
