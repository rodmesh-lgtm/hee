import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const analytics = readFileSync(join(root, "app/dashboard/analytics/page.tsx"), "utf8");

test("analytics treats an unverified owner's stored publication flag as not publicly available", () => {
  assert.match(analytics, /effectivelyPublished\s*=\s*Boolean\(business\.isPublished\s*&&\s*user\.emailVerifiedAt\)/);
  assert.match(analytics, /!effectivelyPublished/);
  assert.match(analytics, /business\.isPublished\s*&&\s*!user\.emailVerifiedAt/);
  assert.match(analytics, /أكد بريد حسابك لإتاحة الصفحة وبدء تسجيل زيارات العملاء/);
  assert.doesNotMatch(analytics, /\{!business\.isPublished\s*\?/);
});
