import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production checkout remains closed until recurring billing operations are explicitly ready", () => {
  const core = source("app/lib/moyasar-core.ts");
  const audit = source("scripts/launch-config-audit.ts");
  assert.match(core, /BILLING_RENEWAL_ENABLED/);
  assert.match(core, /BILLING_OPERATIONS_READY/);
  assert.match(core, /if \(production\)/);
  assert.match(audit, /BILLING_OPERATIONS_READY/);
  assert.match(audit, /recurring billing\/webhook recovery schedule/);
});

test("production live rehearsal is isolated from general paid checkout", () => {
  const billing = source("app/lib/billing.ts");
  const branding = source("app/dashboard/branding/page.tsx");
  const request = source("app/actions/subscription-request.ts");
  const direct = source("app/actions/billing.ts");
  const audit = source("scripts/launch-config-audit.ts");
  const ready = source("app/api/health/ready/route.ts");

  assert.match(billing, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(billing, /BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(billing, /paidCheckoutEntryAllowed/);
  assert.match(branding, /paidCheckoutEntryAllowed\(user\.email\)/);
  assert.match(request, /paidCheckoutEntryAllowed\(owner\.email\)/);
  assert.match(direct, /paidCheckoutEntryAllowed\(user\.email\)/);
  assert.match(audit, /PAID_CHECKOUT_PUBLIC_ENABLED must be true only after the controlled live subscription rehearsal passes/);
  assert.match(audit, /BILLING_REHEARSAL_USER_EMAIL must be removed before general paid launch/);
  assert.match(ready, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(ready, /BILLING_REHEARSAL_USER_EMAIL/);
});

test("scheduled billing operations recover webhooks, renew, audit state, then record liveness", () => {
  const pkg = source("package.json");
  const audit = source("scripts/billing-state-audit.ts");
  const migration = source("prisma/migrations/20260822050000_billing_operations_heartbeat/migration.sql");
  const runbook = source("../../docs/HETZNER_BILLING_RUNBOOK.md");
  assert.match(pkg, /billing:webhooks && npm run billing:renew-only && npm run billing:state-audit -- --record-heartbeat/);
  assert.match(audit, /HEARTBEAT_MAX_AGE_MINUTES = 90/);
  assert.match(audit, /billing operations heartbeat is missing or older than 90 minutes/);
  assert.match(audit, /billingOperationsHeartbeat\.upsert/);
  assert.match(migration, /BillingOperationsHeartbeat/);
  assert.match(runbook, /BILLING_OPERATIONS_READY=true/);
  assert.match(runbook, /durable Moyasar webhook inbox/);
  assert.match(runbook, /Treat a non-zero exit from `npm run billing:renew` as an operational alert/);
});

test("billing state audit rejects expired or indefinite paid entitlements", () => {
  const audit = source("scripts/billing-state-audit.ts");
  assert.match(audit, /paid business plan without matching unexpired live subscription/);
  assert.match(audit, /paid subscription has no finite paid-through date/);
  assert.match(audit, /expired subscription is still marked active\/past_due/);
  assert.match(audit, /s\."endsAt" IS NULL OR s\."endsAt" <= CURRENT_TIMESTAMP/);
  assert.match(audit, /s\."endsAt" > CURRENT_TIMESTAMP/);
  assert.match(audit, /bwe\."attempts" >= 12/);
  assert.match(audit, /processing lease is stuck/);
});

test("billing state audit catches customer-facing plan price drift", () => {
  const audit = source("scripts/billing-state-audit.ts");
  assert.match(audit, /p\."code"='FREE' AND p\."monthlyPrice"<>0/);
  assert.match(audit, /p\."code"='BUSINESS' AND p\."monthlyPrice"<>199/);
  assert.match(audit, /p\."code"='PRO' AND p\."monthlyPrice"<>399/);
  assert.match(audit, /required public plan is missing or inactive/);
});

test("billing management never presents raw Business.plan as an active paid entitlement", () => {
  const page = source("app/dashboard/billing/manage/page.tsx");
  assert.match(page, /subscriptionStillEffective \? subscription\?\.plan\.name \?\? "Free" : "Free"/);
  assert.doesNotMatch(page, /business\.plan\?\.name \?\? "Free"/);
});
