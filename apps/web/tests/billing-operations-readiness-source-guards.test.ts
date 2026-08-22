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

test("scheduled billing operations recover webhooks, renew, then audit state", () => {
  const pkg = source("package.json");
  const runbook = source("../../docs/HETZNER_BILLING_RUNBOOK.md");
  assert.match(pkg, /billing:webhooks && npm run billing:renew-only && npm run billing:state-audit/);
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
