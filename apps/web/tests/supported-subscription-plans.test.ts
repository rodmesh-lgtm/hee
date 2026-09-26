import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedPaidPlan, getPlanEntitlements } from "../app/lib/plan-entitlements";

test("only defined paid plans may be issued as subscriptions", () => {
  for (const code of ["BUSINESS", "PRO"]) {
    assert.equal(isSupportedPaidPlan(code), true);
    assert.notEqual(getPlanEntitlements(code).branchLimit, 1);
  }
  for (const code of ["FREE", "dev-ai-offers", "unknown", "business", "", null, undefined]) {
    assert.equal(isSupportedPaidPlan(code), false);
  }
});
