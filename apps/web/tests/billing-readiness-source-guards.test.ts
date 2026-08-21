import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("mock billing can never activate a paid plan outside test runtime", () => {
  const billing = source("app/lib/billing.ts");
  assert.match(billing, /appEnv === "test" && provider === "mock"/);
  assert.match(billing, /PAID_BILLING_NOT_CONFIGURED/);
  assert.doesNotMatch(billing, /NODE_ENV\s*===\s*["']production["']\s*\?\s*true/);
});

test("manual admin upgrade path fails closed before mutating paid entitlements", () => {
  const admin = source("app/actions/admin.ts");
  const guard = admin.indexOf("assertPaidPlanActivationAllowed(requestedPlan)");
  const mutation = admin.indexOf("data: { planId: plan.id }");
  assert.ok(guard >= 0, "paid admin activation must call the billing guard");
  assert.ok(mutation > guard, "billing proof guard must run before planId mutation");
  assert.match(admin, /billing-not-configured/);
});

test("subscription database enforces lifecycle and one current entitlement", () => {
  const migration = source("prisma/migrations/20260821161000_subscription_integrity/migration.sql");
  assert.match(migration, /Subscription_status_allowed/);
  assert.match(migration, /Subscription_period_valid/);
  assert.match(migration, /Subscription_one_current_per_business/);
  assert.match(migration, /WHERE "status" IN \('active', 'trialing'\)/);
});

test("production billing docs explicitly reject mock activation", () => {
  const env = source("../../.env.example");
  assert.match(env, /mock.*strictly for tests\/development/i);
  assert.match(env, /real provider-backed/i);
});
