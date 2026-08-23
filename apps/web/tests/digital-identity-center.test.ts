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
  assert.match(nav, /الهوية الرقمية/);
  assert.match(nav, /\/dashboard\/digital-identity/);
  assert.match(page, /الملف التعريفي للشركة PDF/);
  assert.match(page, /QR للصفحة الرقمية/);
  assert.match(page, /بطاقة جهة الاتصال vCard/);
  assert.match(page, /اكتمال الهوية الرقمية/);
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

test("public sanitizer permits company profile URL and title but no private identity fields", () => {
  const source = read("app/lib/public-business-sanitize.ts");
  assert.match(source, /companyProfileUrl/);
  assert.match(source, /companyProfileTitle/);
  assert.doesNotMatch(source, /licenseNumber/);
  assert.doesNotMatch(source, /ownerId/);
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
