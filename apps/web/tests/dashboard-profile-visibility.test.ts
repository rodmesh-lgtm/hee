import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = readFileSync(join(here, "../app/dashboard/page.tsx"), "utf8");
const identity = readFileSync(join(here, "../app/dashboard/digital-identity/page.tsx"), "utf8");
const preview = readFileSync(join(here, "../app/preview/page.tsx"), "utf8");
const extras = readFileSync(join(here, "../components/public/public-identity-extras.tsx"), "utf8");

test("dashboard surfaces company profile as a first-class readiness item", () => {
  assert.match(dashboard, /الملف التعريفي PDF/);
  assert.match(dashboard, /companyProfileUrl/);
  assert.match(dashboard, /\/dashboard\/digital-identity#company-profile/);
  assert.match(dashboard, /مركز الأعمال/);
});

test("digital identity company profile has a stable direct anchor", () => {
  assert.match(identity, /id="company-profile"/);
  assert.match(identity, /يظهر في الصفحة العامة وفي المعاينة فورًا/);
});

test("owner preview renders company profile and digital identity extras", () => {
  assert.match(preview, /PublicIdentityExtras/);
  assert.match(preview, /companyProfileUrl=\{business\.companyProfileUrl\}/);
  assert.match(extras, /id="company-profile-section"/);
  assert.match(extras, /عرض الملف/);
});

test("social links are host constrained before rendering", () => {
  for (const host of ["instagram.com", "x.com", "tiktok.com", "snapchat.com", "facebook.com"]) assert.match(extras, new RegExp(host.replace(".", "\\.")));
  assert.match(extras, /noopener/);
});
