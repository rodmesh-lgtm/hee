import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("central customer account operations stay server-admin protected and read-only", async () => {
  const [list, detail, layout, navigation] = await Promise.all([
    source("../app/admin/customers/page.tsx"),
    source("../app/admin/customers/[id]/page.tsx"),
    source("../app/admin/layout.tsx"),
    source("../app/admin/admin-navigation.tsx"),
  ]);

  assert.match(list, /await requireAdmin\(\)/);
  assert.match(detail, /await requireAdmin\(\)/);
  assert.match(layout + navigation, /href:\s*"\/admin\/customers"/);

  for (const text of [list, detail]) {
    assert.doesNotMatch(text, /db\.user\.(?:update|delete|deleteMany|upsert|create)\s*\(/);
    assert.doesNotMatch(text, /db\.business\.(?:update|delete|deleteMany|upsert|create)\s*\(/);
    assert.doesNotMatch(text, /db\.subscription\.(?:update|delete|deleteMany|upsert|create)\s*\(/);
    assert.doesNotMatch(text, /emailVerifiedAt\s*:\s*new Date/);
  }
});

test("customer detail does not read credential or reusable authentication secrets", async () => {
  const detail = await source("../app/admin/customers/[id]/page.tsx");
  assert.doesNotMatch(detail, /passwordHash\s*:\s*true/);
  assert.doesNotMatch(detail, /token\s*:\s*true/);
  assert.doesNotMatch(detail, /providerSubject\s*:\s*true/);
  assert.match(detail, /sessions:[\s\S]*select:\s*\{\s*id:\s*true,\s*createdAt:\s*true,\s*expiresAt:\s*true\s*\}/);
});

test("customer views expose ownership and entitlement evidence without impersonation controls", async () => {
  const [list, detail] = await Promise.all([
    source("../app/admin/customers/page.tsx"),
    source("../app/admin/customers/[id]/page.tsx"),
  ]);
  assert.match(list, /emailVerifiedAt/);
  assert.match(list, /authIdentities/);
  assert.match(list, /businesses/);
  assert.match(detail, /redeemedAccessGrants/);
  assert.match(detail, /subscriptions/);
  assert.doesNotMatch(`${list}\n${detail}`, /impersonat|انتحال جلسة.*button/i);
});
