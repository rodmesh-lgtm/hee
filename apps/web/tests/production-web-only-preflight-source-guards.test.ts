import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync("../../.github/workflows/production-preflight-v2.yml", "utf8");
const sync = readFileSync("../../.github/scripts/sync-vercel-production-env.mjs", "utf8");
const paid = readFileSync("../../.github/workflows/production-open-paid-checkout.yml", "utf8");

test("web-only Production presence defers billing provider and worker config", () => {
  assert.match(preflight, /PRODUCTION_BILLING_RENEWAL_ENABLED/);
  assert.match(preflight, /PRODUCTION_BILLING_OPERATIONS_READY/);
  assert.match(preflight, /PRODUCTION_WHATSAPP_MARKETING_WORKER_ENABLED/);
  assert.match(preflight, /PRODUCTION_WHATSAPP_OUTBOUND_ENABLED/);
  assert.match(preflight, /billingRenewalEnabled/);
  assert.match(preflight, /billingOperationsReady/);
});

test("billing operations restore provider, seller and worker fail-closed requirements", () => {
  assert.match(preflight, /const billingRequired = billingRenewalEnabled \|\| billingOperationsReady/);
  assert.match(preflight, /if \(billingRequired\) \{[\s\S]*MOYASAR_PUBLISHABLE_KEY[\s\S]*BILLING_TAX_STATUS/);
  assert.match(preflight, /if \(billingRequired\) \{[\s\S]*HETZNER_HOST/);
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
  assert.match(sync, /CANONICAL_FROM_EMAIL = "INFRO <no-reply@ir\.sa>"/);
  assert.doesNotMatch(sync, /CANONICAL_FROM_EMAIL = "HEE </);
  assert.match(sync, /key: "HEE_FROM_EMAIL", value: CANONICAL_FROM_EMAIL/);
  assert.match(sync, /key: "PAID_CHECKOUT_PUBLIC_ENABLED", value: "false"/);
  assert.match(sync, /key: "BILLING_REHEARSAL_USER_EMAIL", value: ""/);
});

test("paid checkout summary uses YAML block scalar", () => {
  const tail = paid.slice(paid.indexOf("Public paid launch summary"));
  assert.match(tail, /run: \|\n\s+echo "production-open-paid-checkout: PASS/);
  assert.doesNotMatch(tail, /run: echo "production-open-paid-checkout: PASS/);
});
