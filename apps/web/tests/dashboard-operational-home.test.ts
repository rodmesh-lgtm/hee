import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../app/dashboard/page.tsx"), "utf8");

test("dashboard home exposes real seven-day operating metrics", () => {
  assert.match(source, /نبض الأعمال/);
  assert.match(source, /زيارات 7 أيام/);
  assert.match(source, /تفاعلات 7 أيام/);
  assert.match(source, /طلبات 7 أيام/);
  assert.match(source, /حجوزات 7 أيام/);
  assert.match(source, /db\.analyticsEvent\.count/);
  assert.match(source, /db\.order\.count/);
  assert.match(source, /db\.booking\.count/);
});

test("dashboard interaction pulse includes identity engagement", () => {
  assert.match(source, /company_profile_click/);
  assert.match(source, /social_click/);
});

test("dashboard surfaces the nearest actionable booking", () => {
  assert.match(source, /db\.booking\.findFirst/);
  assert.match(source, /bookingDate: \{ gte: today \}/);
  assert.match(source, /الموعد القادم/);
  assert.match(source, /فتح الحجوزات/);
});

test("dashboard pulse remains tenant scoped", () => {
  const businessScoped = source.match(/businessId: business\.id/g) ?? [];
  assert.ok(businessScoped.length >= 10, `expected tenant scoping on dashboard queries, got ${businessScoped.length}`);
});
