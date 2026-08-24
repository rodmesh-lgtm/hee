import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Business Store is a real authenticated dashboard destination", () => {
  const nav = read("components/dashboard/dashboard-nav.ts");
  const shell = read("components/dashboard/dashboard-shell.tsx");
  const page = read("app/dashboard/business-store/page.tsx");
  assert.match(nav, /متجر الأعمال/);
  assert.match(nav, /\/dashboard\/business-store/);
  assert.match(shell, /"\/dashboard\/business-store": "متجر الأعمال"/);
  assert.match(page, /getCurrentUser/);
  assert.match(page, /getActiveBusinessForUser/);
  assert.match(page, /https:\/\/hee\.sa\/\$\{business\.slug\}/);
});

test("Business Store foundation does not mix HEE merchandise with tenant customer orders or subscription billing", () => {
  const page = read("app/dashboard/business-store/page.tsx");
  assert.doesNotMatch(page, /updateOrderStatusAction|createOrder|BillingPayment|billing\/checkout/);
  assert.match(page, /مشترياتك هنا منفصلة تمامًا عن الطلبات/);
  assert.match(page, /متجر HEE سيستخدم نماذج طلب ودفع مستقلة/);
});

test("Business Store does not expose a fake purchase action before checkout exists", () => {
  const page = read("app/dashboard/business-store/page.tsx");
  assert.match(page, /disabled className=/);
  assert.match(page, /الشراء مغلق أثناء التأسيس/);
  assert.match(page, /سيتاح بعد اكتمال مسار الطلب/);
  assert.doesNotMatch(page, /api\.qrserver\.com|chart\.googleapis\.com/);
});
