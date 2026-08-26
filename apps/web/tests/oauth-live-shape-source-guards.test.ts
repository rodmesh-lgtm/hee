import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("launch audit rejects obviously malformed Google and Apple credential shapes", () => {
  assert.match(audit, /\.apps\.googleusercontent\.com/);
  assert.match(audit, /APPLE_TEAM_ID must be a 10-character Apple Team ID/);
  assert.match(audit, /APPLE_KEY_ID must be a 10-character Apple key ID/);
  assert.match(audit, /APPLE_CLIENT_ID must be an Apple Services ID/);
  assert.match(audit, /APPLE_PRIVATE_KEY must contain a PKCS#8 private key/);
});
