import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) { return readFileSync(new URL(`../${path}`, import.meta.url), "utf8"); }

test("customer dashboard exposes a dedicated verification request flow", () => {
  const nav = source("components/dashboard/dashboard-nav.ts");
  const page = source("app/dashboard/verification/page.tsx");
  assert.match(nav, /توثيق الصفحة/);
  assert.match(nav, /\/dashboard\/verification/);
  assert.match(page, /requestVerificationAction/);
  assert.match(page, /إرسال طلب التوثيق/);
  assert.match(page, /hasPendingVerificationRequest/);
});

test("central admin can directly change verification with an audit trail", () => {
  const action = source("app/actions/admin-verification-control.ts");
  const page = source("app/admin/businesses\/\[id\]\/page.tsx".replaceAll("\\/", "/"));
  assert.match(action, /requireAdmin\(\)/);
  assert.match(action, /pg_advisory_xact_lock/);
  assert.match(action, /admin_verification_changed/);
  assert.match(action, /reviewedByUserId/);
  assert.match(action, /reviewedByEmail/);
  assert.match(page, /setBusinessVerificationAdminAction/);
  assert.match(page, /توثيق الصفحة الآن/);
  assert.match(page, /إلغاء توثيق الصفحة/);
});
