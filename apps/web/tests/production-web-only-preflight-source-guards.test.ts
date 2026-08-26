import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(process.cwd(), "../..");
const auditPath = resolve(root, ".github/scripts/production-config-presence-audit.mjs");
const preflight = readFileSync(resolve(root, ".github/workflows/production-preflight-v2.yml"), "utf8");
const sync = readFileSync(resolve(root, ".github/scripts/sync-vercel-production-env.mjs"), "utf8");
const paid = readFileSync(resolve(root, ".github/workflows/production-open-paid-checkout.yml"), "utf8");

function webOnlyEnv() {
  return {
    ...process.env,
    DATABASE_URL: "present",
    RESTORE_DATABASE_URL: "present",
    PRODUCTION_BACKUP_PASSPHRASE: "present",
    SESSION_SECRET: "present",
    RESEND_API_KEY: "present",
    BILLING_TOKEN_ENCRYPTION_KEY: "present",
    VERCEL_TOKEN: "present",
    PG_POOL_MAX: "2",
    HEE_FROM_EMAIL: "HEE <noreply@ir.sa>",
    BILLING_RENEWAL_ENABLED: "false",
    BILLING_OPERATIONS_READY: "false",
    PAID_CHECKOUT_PUBLIC_ENABLED: "false",
    STORAGE_DRIVER: "database",
    MOYASAR_PUBLISHABLE_KEY: "",
    MOYASAR_SECRET_KEY: "",
    MOYASAR_WEBHOOK_SECRET: "",
    BILLING_SELLER_LEGAL_NAME_AR: "",
    BILLING_SELLER_ADDRESS_AR: "",
    BILLING_TAX_STATUS: "",
    HETZNER_HOST: "",
    HETZNER_USER: "",
    HETZNER_SSH_PRIVATE_KEY: "",
    HETZNER_KNOWN_HOSTS: "",
  };
}

test("web-only Production presence defers billing provider and worker config", () => {
  const run = spawnSync(process.execPath, [auditPath], { env: webOnlyEnv(), encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /production-config-presence: PASS/);
});

test("billing operations restore provider, seller and worker fail-closed requirements", () => {
  const run = spawnSync(process.execPath, [auditPath], {
    env: { ...webOnlyEnv(), BILLING_OPERATIONS_READY: "true" },
    encoding: "utf8",
  });
  assert.notEqual(run.status, 0);
  for (const name of [
    "MOYASAR_PUBLISHABLE_KEY", "MOYASAR_SECRET_KEY", "MOYASAR_WEBHOOK_SECRET",
    "BILLING_SELLER_LEGAL_NAME_AR", "BILLING_SELLER_ADDRESS_AR", "BILLING_TAX_STATUS",
    "HETZNER_HOST", "HETZNER_USER", "HETZNER_SSH_PRIVATE_KEY", "HETZNER_KNOWN_HOSTS",
  ]) assert.match(run.stderr, new RegExp(name));
});

test("Moyasar preflight probe is conditional with billing operations", () => {
  const start = preflight.indexOf("Verify Moyasar live secret credential read-only");
  const end = preflight.indexOf("Verify Hetzner worker rollback baseline", start);
  const segment = preflight.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(segment, /PRODUCTION_BILLING_RENEWAL_ENABLED/);
  assert.match(segment, /PRODUCTION_BILLING_OPERATIONS_READY/);
  assert.match(preflight, /const billingRequired = billingRenewalEnabled \|\| billingOperationsReady/);
});

test("Vercel Production environment sync keeps billing credentials fail-closed but optional for web-only cutover", () => {
  assert.match(sync, /const billingRequired = enabled\("BILLING_RENEWAL_ENABLED"\) \|\| enabled\("BILLING_OPERATIONS_READY"\)/);
  assert.match(sync, /if \(billingRequired\) \{[\s\S]*required\("MOYASAR_PUBLISHABLE_KEY"\)[\s\S]*required\("BILLING_TAX_STATUS"\)/);
  assert.doesNotMatch(sync, /required\("HEE_FROM_EMAIL"\)/);
  assert.match(sync, /CANONICAL_FROM_EMAIL = "HEE <no-reply@ir\.sa>"/);
  assert.match(sync, /key: "HEE_FROM_EMAIL", value: CANONICAL_FROM_EMAIL/);
  assert.match(sync, /key: "PAID_CHECKOUT_PUBLIC_ENABLED", value: "false"/);
  assert.match(sync, /key: "BILLING_REHEARSAL_USER_EMAIL", value: ""/);
});

test("paid checkout summary uses YAML block scalar", () => {
  const tail = paid.slice(paid.indexOf("Public paid launch summary"));
  assert.match(tail, /run: \|\n\s+echo "production-open-paid-checkout: PASS/);
  assert.doesNotMatch(tail, /run: echo "production-open-paid-checkout: PASS/);
});
