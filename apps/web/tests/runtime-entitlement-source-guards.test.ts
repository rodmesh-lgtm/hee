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

test("billing management labels the effective plan instead of an expired historical subscription", () => {
  const page = source("app/dashboard/billing/manage/page.tsx");
  assert.match(page, /subscriptionStillEffective/);
  assert.match(page, /الباقة الفعالة الآن/);
  assert.match(page, /انتهت الفترة المدفوعة المسجلة/);
});
