import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../app/login/login-content.tsx", import.meta.url), "utf8");
const launch = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("every social provider shown to customers is gated by runtime readiness and audited", () => {
  for (const provider of ["google", "apple"] as const) {
    assert.match(page, new RegExp(`providerConfigured\\("${provider}"\\)`));
    assert.match(client, new RegExp(`/api/auth/oauth/${provider}`));
  }
  assert.match(client, /googleEnabled \?/);
  assert.match(client, /appleEnabled \?/);
  assert.match(launch, /productionOauthReadiness\(\)/);
  assert.doesNotMatch(launch, /Google OAuth must be fully configured or fully disabled/);
  assert.doesNotMatch(launch, /Apple OAuth must be fully configured or fully disabled/);
});
