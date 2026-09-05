import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nav = readFileSync(new URL("../components/dashboard/dashboard-nav.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/dashboard/dashboard-shell.tsx", import.meta.url), "utf8");
const adminLayout = readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
const adminNavigation = readFileSync(new URL("../app/admin/admin-navigation.tsx", import.meta.url), "utf8");
const adminOverview = readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const adminRequests = readFileSync(new URL("../app/admin/requests/page.tsx", import.meta.url), "utf8");

test("dashboard keeps nested editors and billing routes anchored to their parent navigation", () => {
  assert.match(nav, /activePrefixes\?: string\[\]/);
  assert.match(nav, /"\/dashboard\/services"/);
  assert.match(nav, /"\/dashboard\/billing"/);
  assert.match(shell, /item\.activePrefixes/);
  assert.match(shell, /"\/dashboard\/billing\/manage":"إدارة الاشتراك والفوترة"/);
  assert.match(shell, /"\/dashboard\/support":"الدعم والمساعدة"/);
});

test("admin navigation exposes customer support operations", () => {
  assert.match(adminLayout + adminNavigation, /href:\s*"\/admin\/support"/);
  assert.match(adminLayout + adminNavigation, /label: "دعم العملاء"/);
});

test("production admin UI cannot present a dead manual paid-plan approval path", () => {
  for (const source of [adminOverview, adminRequests]) {
    assert.match(source, /paidPlanActivationAllowed/);
    assert.match(source, /manualPaidActivation/);
    assert.match(source, /يتطلب دفعًا موثقًا/);
  }
  assert.match(adminRequests, /لا تمنح لوحة الإدارة BUSINESS أو PRO يدويًا/);
  assert.match(adminOverview, /دفعًا موثقًا/);
});
