import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("inactive directory records cannot bypass downgraded plan limits by reactivation", () => {
  const directory = source("app/actions/directory.ts");
  assert.match(directory, /!current\.isActive && nextActive[\s\S]*entitlements\.branchLimit/);
  assert.match(directory, /!current\.isActive && nextActive[\s\S]*entitlements\.departmentLimit/);
  assert.match(directory, /!current\.isActive && nextActive[\s\S]*entitlements\.contactLimit/);
  assert.match(directory, /error-plan-branch-limit/);
  assert.match(directory, /error-plan-department-limit/);
  assert.match(directory, /error-plan-contact-limit/);
});
