import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/dashboard/notifications/page.tsx", "utf8");
const actions = readFileSync("app/actions/reminder-notifications.ts", "utf8");
const nav = readFileSync("components/dashboard/dashboard-nav.ts", "utf8");
const shell = readFileSync("components/dashboard/dashboard-shell.tsx", "utf8");

test("notification center always scopes reads to both active business and current user", () => {
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(page, /"businessId"\s*=\s*\$\{business\.id\}/);
  assert.match(page, /"userId"\s*=\s*\$\{user\.id\}/);
  assert.match(page, /LIMIT 100/);
});

test("notification read mutations cannot cross tenant or user boundaries", () => {
  assert.match(actions, /getCurrentUserForWrites\(\)/);
  assert.match(actions, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(actions, /"id"\s*=\s*\$\{notificationId\}[\s\S]*"businessId"\s*=\s*\$\{context\.businessId\}[\s\S]*"userId"\s*=\s*\$\{context\.userId\}/);
  assert.match(actions, /"businessId"\s*=\s*\$\{context\.businessId\}[\s\S]*"userId"\s*=\s*\$\{context\.userId\}[\s\S]*"readAt" IS NULL/);
});

test("notification center is discoverable without adding a sixth mobile primary tab", () => {
  assert.match(nav, /href:\s*"\/dashboard\/notifications"/);
  const quickMatch = shell.match(/const quick=\[([\s\S]*?)\];/);
  assert.ok(quickMatch);
  assert.equal((quickMatch[1].match(/label:/g) ?? []).length, 4);
  assert.doesNotMatch(quickMatch[1], /\/dashboard\/notifications/);
});
