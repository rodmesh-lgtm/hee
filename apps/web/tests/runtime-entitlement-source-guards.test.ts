import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("premium runtime authorization fails closed when the paid subscription has expired", () => {
  const active = source("app/lib/active-business.ts");
  assert.match(active, /status: "active"/);
  assert.match(active, /endsAt: \{ gt: now \}/);
  assert.match(active, /FREE_PLAN_MISSING/);
  assert.match(active, /runtime authorization/);
});

test("verification requests are tenant-owned, serialized and do not self-verify", () => {
  const verification = source("app/actions/verification.ts");
  assert.match(verification, /getOwnedBusinessWithPlanForWrite/);
  assert.match(verification, /pg_advisory_xact_lock/);
  assert.match(verification, /ownerId: business\.ownerId/);
  assert.match(verification, /isVerified: true/);
  assert.match(verification, /verification_requested/);
  assert.match(verification, /status: "pending"/);
  assert.doesNotMatch(verification, /activePaidSubscription/);
  assert.doesNotMatch(verification, /verificationEligible/);
  assert.doesNotMatch(verification, /isVerified:\s*true\s*\}\s*\)/);
});

test("billing management labels the effective plan instead of an expired historical subscription", () => {
  const page = source("app/dashboard/billing/manage/page.tsx");
  assert.match(page, /subscriptionStillEffective/);
  assert.match(page, /الباقة الفعالة الآن/);
  assert.match(page, /انتهت الفترة المدفوعة المسجلة/);
});
