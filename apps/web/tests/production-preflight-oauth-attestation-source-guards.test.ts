import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const attestation = readFileSync(new URL("../../../.github/scripts/production-config-attestation.mjs", import.meta.url), "utf8");
const preflight = readFileSync(new URL("../../../.github/workflows/production-preflight-v2.yml", import.meta.url), "utf8");

test("Production Preflight attestation permits disabled OAuth but rejects partial credentials", () => {
  assert.match(preflight, /production-config-attestation\.mjs write/);
  assert.match(attestation, /function requireAllOrNone\(label, names\)/);
  assert.match(attestation, /\$\{label\} OAuth must be either fully configured or fully disabled/);
  assert.match(attestation, /\["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"\]/);
  assert.match(attestation, /\["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"\]/);
  assert.match(attestation, /if \(scope === "release-core"\) \{[\s\S]*validateProductionOauth\(\)/);
});

test("configured OAuth credential shapes are re-proved when release-core attestation is verified", () => {
  assert.match(attestation, /\.apps\.googleusercontent\.com/);
  assert.match(attestation, /\^\[A-Z0-9\]\{10\}\$/);
  assert.match(attestation, /BEGIN PRIVATE KEY/);
  assert.match(attestation, /const current = digest\(scope\)/);
});
