import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const launch = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("every social provider shown to customers is mandatory in launch audit", () => {
  for (const provider of ["google", "apple"] as const) {
    assert.match(login, new RegExp(`/api/auth/oauth/${provider}`));
  }
  assert.match(launch, /productionOauthReadiness\(\)/);
  assert.doesNotMatch(launch, /Google OAuth must be fully configured or fully disabled/);
  assert.doesNotMatch(launch, /Apple OAuth must be fully configured or fully disabled/);
});
