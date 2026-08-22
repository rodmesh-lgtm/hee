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

test("billing state audit treats expired paid subscriptions as drift instead of live entitlement", () => {
  const audit = source("scripts/billing-state-audit.ts");
  assert.match(audit, /paid business plan without matching unexpired live subscription/);
  assert.match(audit, /expired subscription is still marked active\/past_due/);
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
