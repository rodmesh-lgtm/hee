import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(process.cwd(), "../..");
const audit = readFileSync(resolve(root, ".github/scripts/production-config-presence-audit.mjs"), "utf8");
const databaseSafety = readFileSync(resolve(root, ".github/scripts/require-production-database-safety.mjs"), "utf8");
const preflight = readFileSync(resolve(root, ".github/workflows/production-preflight-v2.yml"), "utf8");
const cutover = readFileSync(resolve(root, ".github/workflows/production-canonical-cutover-orchestrator.yml"), "utf8");

test("Production presence audit enumerates release-critical configuration without printing values", () => {
  for (const name of [
    "DATABASE_URL",
    "RESTORE_DATABASE_URL",
    "PRODUCTION_BACKUP_PASSPHRASE",
    "SESSION_SECRET",
    "RESEND_API_KEY",
    "MOYASAR_PUBLISHABLE_KEY",
    "MOYASAR_SECRET_KEY",
    "MOYASAR_WEBHOOK_SECRET",
    "BILLING_TOKEN_ENCRYPTION_KEY",
    "VERCEL_TOKEN",
    "PG_POOL_MAX",
    "BILLING_SELLER_LEGAL_NAME_AR",
    "BILLING_SELLER_ADDRESS_AR",
    "BILLING_TAX_STATUS",
    "BILLING_RENEWAL_ENABLED",
    "BILLING_OPERATIONS_READY",
    "PAID_CHECKOUT_PUBLIC_ENABLED",
    "STORAGE_DRIVER",
  ]) {
    assert.match(audit, new RegExp(`['\"]${name}['\"]`));
  }
  assert.doesNotMatch(audit, /required[\s\S]*['\"]HEE_FROM_EMAIL['\"]/);
  assert.match(audit, /CANONICAL_FROM_EMAIL = 'HEE <no-reply@ir\.sa>'/);
  assert.match(audit, /appendFileSync\(githubEnv, `HEE_FROM_EMAIL=\$\{CANONICAL_FROM_EMAIL\}\\n`/);
  assert.match(audit, /production-config-presence: FAIL missing=/);
  assert.doesNotMatch(audit, /console\.(?:log|error)\([^\n]*(?:process\.env|value\()/);
});

test("Preflight reaches complete config presence audit before database parsing and external probes", () => {
  const quality = preflight.indexOf("Require content-proven RC Quality for release");
  const presenceStep = preflight.indexOf("Require complete Production configuration presence");
  const presenceRun = preflight.indexOf("node .github/scripts/production-config-presence-audit.mjs", presenceStep);
  const databaseStep = preflight.indexOf("Require verify-full PostgreSQL transport before any database probe");
  const external = preflight.indexOf("Verify Vercel credential and HEE project read-only");

  assert.ok(quality >= 0);
  assert.ok(presenceStep > quality);
  assert.ok(presenceRun > presenceStep);
  assert.ok(databaseStep > presenceRun);
  assert.ok(external > databaseStep);
  assert.doesNotMatch(databaseSafety, /production-config-presence-audit/);
});

test("Canonical cutover completes read-only Preflight before admin-domain mutation and web deploy", () => {
  const preflightDispatch = cutover.indexOf("Dispatch exact-head Production Preflight V2");
  const preflightProof = cutover.indexOf("Require successful exact-SHA Production Preflight V2");
  const admin = cutover.indexOf("Ensure central admin domain is registered and DNS-ready");
  const headProof = cutover.indexOf("Re-prove unchanged release head before Production mutation");
  const deploy = cutover.indexOf("Dispatch exact-head Production Web Deploy");

  assert.ok(preflightDispatch >= 0);
  assert.ok(preflightProof > preflightDispatch);
  assert.ok(admin > preflightProof);
  assert.ok(headProof > admin);
  assert.ok(deploy > headProof);
});
