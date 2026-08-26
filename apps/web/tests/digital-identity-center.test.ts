import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("dashboard exposes a dedicated digital identity center", () => {
  const nav = read("components/dashboard/dashboard-nav.ts");
  const page = read("app/dashboard/digital-identity/page.tsx");
  const assets = read("components/dashboard/identity-assets.tsx");
  assert.match(nav, /الهوية الرقمية/);
  assert.match(nav, /\/dashboard\/digital-identity/);
  assert.match(page, /الملف التعريفي للشركة PDF/);
  assert.match(page, /الرابط والاتصال/);
  assert.match(page, /تنزيل vCard/);
  assert.match(page, /IdentityAssets/);
  assert.match(page, /اكتمال الهوية الرقمية/);
  assert.match(assets, /بطاقة الأعمال الرقمية/);
  assert.match(assets, /توقيع البريد/);
  assert.doesNotMatch(page, /api\.qrserver\.com/);
  assert.doesNotMatch(assets, /api\.qrserver\.com/);
});

test("company profile upload is authenticated, rate limited and PDF-only through storage", () => {
  const action = read("app/actions/digital-identity.ts");
  const storage = read("app/lib/storage.ts");
  assert.match(action, /getCurrentUserForWrites/);
  assert.match(action, /scope: "company-profile"/);
  assert.match(action, /companyProfileUrl/);
  assert.match(action, /removeReplacedPersistentUrl/);
  assert.match(storage, /folder === "company-profiles"/);
  assert.match(storage, /mimeType !== "application\/pdf"/);
});

test("public sanitizer and published page expose only the approved company profile fields", () => {
  const sanitizer = read("app/lib/public-business-sanitize.ts");
  const publicPage = read("app/[slug]/page.tsx");
  const highlights = read("components/public/public-identity-highlights.tsx");
  assert.match(sanitizer, /companyProfileUrl/);
  assert.match(sanitizer, /companyProfileTitle/);
  assert.doesNotMatch(sanitizer, /licenseNumber/);
  assert.doesNotMatch(sanitizer, /ownerId/);
  assert.match(publicPage, /publicBusiness\.companyProfileUrl/);
  assert.match(publicPage, /PublicIdentityHighlights/);
  assert.match(highlights, /عرض الملف الرسمي للمنشأة/);
});

test("vCard export is authenticated and does not expose internal identifiers", () => {
  const source = read("app/api/dashboard/vcard/route.ts");
  assert.match(source, /getCurrentUser/);
  assert.match(source, /getActiveBusinessForUser/);
  assert.match(source, /BEGIN:VCARD/);
  assert.match(source, /text\/vcard/);
  assert.doesNotMatch(source, /ownerId/);
  assert.doesNotMatch(source, /licenseNumber/);
});
