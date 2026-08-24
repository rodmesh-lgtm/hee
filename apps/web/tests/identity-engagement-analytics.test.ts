import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tracker = readFileSync(join(here, "../components/public-business-analytics.tsx"), "utf8");
const extras = readFileSync(join(here, "../components/public/public-identity-extras.tsx"), "utf8");
const route = readFileSync(join(here, "../app/api/public/analytics/route.ts"), "utf8");
const dashboard = readFileSync(join(here, "../app/dashboard/analytics/page.tsx"), "utf8");

test("identity surfaces declare explicit analytics events", () => {
  assert.match(extras, /data-analytics-event="company_profile_click"/);
  assert.match(extras, /data-analytics-event="social_click"/);
});

test("explicit identity events take precedence over generic website classification", () => {
  const explicit = tracker.indexOf('analyticsEvent === "company_profile_click"');
  const generic = tracker.indexOf('href && /^https?:/i.test(href)');
  assert.ok(explicit >= 0 && generic > explicit);
});

test("public analytics endpoint allowlists identity events", () => {
  assert.match(route, /"company_profile_click"/);
  assert.match(route, /"social_click"/);
  assert.match(route, /ALLOWED_EVENTS\.has\(eventType\)/);
});

test("dashboard reports company-profile and social engagement", () => {
  assert.match(dashboard, /تفاعل الهوية الرقمية/);
  assert.match(dashboard, /فتح الملف التعريفي PDF/);
  assert.match(dashboard, /انتقال للحسابات الرسمية/);
  assert.match(dashboard, /company_profile_click/);
  assert.match(dashboard, /social_click/);
});
