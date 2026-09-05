import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../app/dashboard/page.tsx"), "utf8");

test("dashboard home exposes real seven-day operating metrics", () => {
  assert.match(source, /آخر 7 أيام/);
  for (const label of ["الزيارات", "التفاعل", "الطلبات", "الحجوزات"]) assert.match(source, new RegExp(label));
  assert.match(source, /db\.analyticsEvent\.count/);
  assert.match(source, /db\.order\.count/);
  assert.match(source, /db\.booking\.count/);
});

test("dashboard operating window uses the database clock", () => {
  assert.match(source, /CURRENT_TIMESTAMP - INTERVAL '7 days'/);
  assert.match(source, /AT TIME ZONE 'Asia\/Riyadh'/);
  assert.doesNotMatch(source, /Date\.now\(/);
});

test("dashboard interaction pulse includes identity engagement", () => {
  assert.match(source, /company_profile_click/);
  assert.match(source, /social_click/);
});

test("dashboard surfaces the nearest actionable booking", () => {
  assert.match(source, /db\.booking\.findFirst/);
  assert.match(source, /bookingDate:\{gte:today\}/);
  assert.match(source, /NEXT APPOINTMENT/);
  assert.match(source, /فتح الحجوزات/);
});

test("dashboard pulse remains tenant scoped", () => {
  const businessScoped = source.match(/businessId:business\.id/g) ?? [];
  assert.ok(businessScoped.length >= 10, `expected tenant scoping on dashboard queries, got ${businessScoped.length}`);
});
