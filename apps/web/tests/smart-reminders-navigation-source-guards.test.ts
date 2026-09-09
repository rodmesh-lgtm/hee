import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const customerNav = readFileSync("components/dashboard/dashboard-nav.ts", "utf8");
const customerShell = readFileSync("components/dashboard/dashboard-shell.tsx", "utf8");
const adminNav = readFileSync("app/admin/admin-navigation.tsx", "utf8");

test("smart reminders are discoverable without adding a sixth customer mobile primary tab", () => {
  assert.match(customerNav, /href:\s*"\/dashboard\/reminders"/);
  assert.match(customerNav, /label:\s*"التذكيرات الذكية"/);
  const quickMatch = customerShell.match(/const quick=\[([\s\S]*?)\];/);
  assert.ok(quickMatch, "customer mobile quick navigation must remain explicit");
  assert.equal((quickMatch[1].match(/label:/g) ?? []).length, 4);
  assert.match(customerShell, /<span>المزيد<\/span>/);
  assert.doesNotMatch(quickMatch[1], /\/dashboard\/reminders/);
});

test("admin reminder operations are reachable from operations navigation while mobile keeps four primaries plus More", () => {
  assert.match(adminNav, /href:\s*"\/admin\/whatsapp\/reminders"/);
  assert.match(adminNav, /label:\s*"التذكيرات الذكية"/);
  const mobileMatch = adminNav.match(/const mobilePrimary:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(mobileMatch, "admin mobile primary navigation must remain explicit");
  assert.equal((mobileMatch[1].match(/href:/g) ?? []).length, 4);
  assert.match(adminNav, /<span>المزيد<\/span>/);
  assert.doesNotMatch(mobileMatch[1], /\/admin\/whatsapp\/reminders/);
});
