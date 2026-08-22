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
  assert.match(core, /if \(isProductionRuntime\(\)\)/);
  assert.match(core, /import \{ isProductionRuntime \} from "\.\/runtime-environment"/);
  assert.match(audit, /BILLING_OPERATIONS_READY/);
  assert.match(audit, /recurring billing\/webhook recovery schedule/);
});

test("production live rehearsal is isolated from general paid checkout and public mode is deployment-proven", () => {
  const billing = source("app/lib/billing.ts");
  const branding = source("app/dashboard/branding/page.tsx");
  const request = source("app/actions/subscription-request.ts");
  const direct = source("app/actions/billing.ts");
  const ready = source("app/api/health/ready/route.ts");
  const launchStatus = source("app/api/billing/launch-status/route.ts");
  const rehearsal = source("../../.github/workflows/production-billing-rehearsal.yml");
  const open = source("../../.github/workflows/production-open-paid-checkout.yml");
  const sync = source("../../.github/scripts/sync-vercel-production-env.mjs");

  assert.match(billing, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(billing, /BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(billing, /paidCheckoutEntryAllowed/);
  assert.match(branding, /paidCheckoutEntryAllowed\(user\.email\)/);
  assert.match(request, /paidCheckoutEntryAllowed\(owner\.email\)/);
  assert.match(direct, /paidCheckoutEntryAllowed\(user\.email\)/);
  assert.match(ready, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(ready, /BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(launchStatus, /return "public"/);
  assert.match(launchStatus, /return "rehearsal"/);
  assert.match(launchStatus, /return "closed"/);
  assert.match(rehearsal, /HEE_BILLING_LAUNCH_MODE: rehearsal/);
  assert.match(open, /HEE_BILLING_LAUNCH_MODE: public/);
  assert.match(sync, /key: "PAID_CHECKOUT_PUBLIC_ENABLED", value: "false"/);
  assert.match(sync, /key: "BILLING_REHEARSAL_USER_EMAIL", value: ""/);
});

test("scheduled billing operations recover webhooks, renew, audit state, then record exact-release liveness", () => {
  const pkg = source("package.json");
  const audit = source("scripts/billing-state-audit.ts");
  const baseMigration = source("prisma/migrations/20260822050000_billing_operations_heartbeat/migration.sql");
  const releaseMigration = source("prisma/migrations/20260822111500_billing_worker_release_provenance/migration.sql");
  const schema = source("prisma/schema.prisma");
  const ready = source("app/api/health/ready/route.ts");
  const launch = source("../../.github/workflows/production-launch-readiness.yml");
  const runbook = source("../../docs/HETZNER_BILLING_RUNBOOK.md");

  assert.match(pkg, /billing:webhooks && npm run billing:renew-only && npm run billing:state-audit -- --record-heartbeat/);
  assert.match(audit, /HEARTBEAT_MAX_AGE_MINUTES = 90/);
  assert.match(audit, /Production billing audit requires RELEASE_SHA/);
  assert.match(audit, /billing operations heartbeat is missing or older than 90 minutes/);
  assert.match(audit, /billing operations worker release SHA does not match the audited web release/);
  assert.match(audit, /billingOperationsHeartbeat\.upsert/);
  assert.match(audit, /releaseSha: validReleaseSha \? releaseSha : null/);
  assert.match(baseMigration, /BillingOperationsHeartbeat/);
  assert.match(releaseMigration, /ADD COLUMN "releaseSha" TEXT/);
  assert.match(schema, /releaseSha String\?/);
  assert.match(ready, /heartbeat\.releaseSha/);
  assert.match(ready, /runtimeReleaseSha/);
  assert.match(launch, /RELEASE_SHA: \$\{\{ github\.sha \}\}/);
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
