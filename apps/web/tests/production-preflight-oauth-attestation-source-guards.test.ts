import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const attestation = readFileSync(new URL("../../../.github/scripts/production-config-attestation.mjs", import.meta.url), "utf8");
const preflight = readFileSync(new URL("../../../.github/workflows/production-preflight-v2.yml", import.meta.url), "utf8");

test("Production Preflight cannot attest release-core with missing advertised OAuth providers", () => {
  assert.match(preflight, /production-config-attestation\.mjs write/);
  assert.match(attestation, /function validateProductionOauth\(\)/);
  assert.match(attestation, /required\("GOOGLE_CLIENT_ID"\)/);
  assert.match(attestation, /required\("GOOGLE_CLIENT_SECRET"\)/);
  assert.match(attestation, /required\("APPLE_CLIENT_ID"\)/);
  assert.match(attestation, /required\("APPLE_TEAM_ID"\)/);
  assert.match(attestation, /required\("APPLE_KEY_ID"\)/);
  assert.match(attestation, /required\("APPLE_PRIVATE_KEY"\)/);
  assert.match(attestation, /if \(scope === "release-core"\) \{[\s\S]*validateProductionOauth\(\)/);
});

test("OAuth credential shapes are re-proved when release-core attestation is verified", () => {
  assert.match(attestation, /\.apps\.googleusercontent\.com/);
  assert.match(attestation, /\^\[A-Z0-9\]\{10\}\$/);
  assert.match(attestation, /BEGIN PRIVATE KEY/);
  assert.match(attestation, /const current = digest\(scope\)/);
});
