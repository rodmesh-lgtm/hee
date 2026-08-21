import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const publicIdentityFiles = [
  "app/lib/public-business.ts",
  "app/api/public/orders/route.ts",
  "app/api/public/bookings/route.ts",
  "app/api/public/analytics/route.ts",
  "app/api/storage/[storageKey]/route.ts",
  "app/sitemap.ts",
] as const;

test("all public identity boundaries require an active verified owner", () => {
  for (const path of publicIdentityFiles) {
    const value = source(path);
    assert.match(value, /emailVerifiedAt:\s*\{\s*not:\s*null\s*\}/, `${path} must require verified mailbox ownership`);
    assert.match(value, /deletedAt:\s*null/, `${path} must preserve soft-delete visibility rules`);
  }
});

test("public identity protection has no test-environment bypass", () => {
  for (const path of publicIdentityFiles) {
    const value = source(path);
    assert.doesNotMatch(value, /APP_ENV/, `${path} must use the same identity invariant in tests and production`);
    assert.doesNotMatch(value, /NODE_ENV\s*!==\s*["']production["']/, `${path} must not weaken verification outside production`);
  }

  const publication = source("app/actions/publication.ts");
  assert.match(publication, /if \(!owner\?\.emailVerifiedAt\)/);
  assert.doesNotMatch(publication, /@hee\.test/);
  assert.doesNotMatch(publication, /APP_ENV/);
});

test("published test fixtures declare verification explicitly", () => {
  for (const path of [
    "prisma/seed.ts",
    "tests/rc-owner-workflow.spec.ts",
    "tests/transactions-workflow.spec.ts",
    "tests/booking-duration-workflow.spec.ts",
    "tests/public-idempotency-workflow.spec.ts",
  ]) {
    assert.match(source(path), /emailVerifiedAt:\s*new Date\(\)/, `${path} must seed a verified owner when testing an already-public business`);
  }
});

test("production email verification links are pinned and launch config is documented", () => {
  const verification = source("app/lib/email-verification.ts");
  assert.match(verification, /VERCEL_ENV === "production" \|\| process\.env\.NODE_ENV === "production"/);
  assert.match(verification, /return "https:\/\/hee\.sa"/);

  const envExample = source("../../.env.example");
  assert.match(envExample, /RESEND_API_KEY=/);
  assert.match(envExample, /HEE_FROM_EMAIL=/);
});
