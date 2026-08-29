import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("production launch permits disabled OAuth but fails closed on partial provider credentials", () => {
  assert.match(audit, /function requireAllOrNone\(label: string, names: string\[\]\)/);
  assert.match(audit, /\$\{label\} OAuth must be either fully configured or fully disabled/);
  assert.match(audit, /\["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"\]/);
  assert.match(audit, /\["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"\]/);
  assert.match(audit, /productionOauthReadiness\(\)/);
});
