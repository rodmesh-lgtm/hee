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
