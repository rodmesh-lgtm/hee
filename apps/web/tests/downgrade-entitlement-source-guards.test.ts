import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("downgrade policy retains customer data and blocks only growth above plan limits", () => {
  const entitlements = source("app/lib/plan-entitlements.ts");
  const worker = source("scripts/billing-renewal-worker.ts");
  const directory = source("app/actions/directory.ts");

  assert.match(entitlements, /Downgrades are non-destructive/);
  assert.match(entitlements, /canIncreaseLimitedUsage/);
  assert.match(entitlements, /usageOverLimit/);
  assert.doesNotMatch(worker, /deleteMany\s*\(/);
  assert.doesNotMatch(worker, /DELETE FROM "(?:Product|Branch|Department|ContactPerson)"/);
  assert.match(directory, /limitReached\(branchCount, entitlements\.branchLimit\)/);
  assert.match(directory, /limitReached\(count, entitlements\.departmentLimit\)/);
  assert.match(directory, /limitReached\(count, entitlements\.contactLimit\)/);
});
