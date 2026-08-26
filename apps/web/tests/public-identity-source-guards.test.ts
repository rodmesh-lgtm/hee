import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function source(path: string) { return readFileSync(join(root, path), "utf8"); }

test("all public identity boundaries require an active verified owner", () => {
  const publicBusiness = source("app/lib/public-business.ts");
  assert.match(publicBusiness, /deletedAt:\s*null/);
  assert.match(publicBusiness, /owner:\s*\{\s*deletedAt:\s*null,\s*emailVerifiedAt:\s*\{\s*not:\s*null\s*\}\s*\}/);

  const canonicalPage = source("app/[slug]/page.tsx");
  assert.match(canonicalPage, /getBusinessPublic/);

  const legacyPage = source("app/b/[slug]/page.tsx");
  assert.match(legacyPage, /redirect\(`\/\$\{normalizedSlug\}`\)/);

  for (const path of [
    "app/api/public/analytics/route.ts",
    "app/api/public/orders/route.ts",
    "app/api/public/bookings/route.ts",
  ]) {
    const content = source(path);
    assert.match(content, /deletedAt:\s*null/, `${path} must require an active owner/business`);
    assert.match(content, /emailVerifiedAt:\s*\{\s*not:\s*null\s*\}/, `${path} must require verified owner email`);
  }
});

test("public identity protection has no test-environment bypass", () => {
  for (const path of [
    "app/lib/public-business.ts",
    "app/[slug]/page.tsx",
    "app/b/[slug]/page.tsx",
    "app/api/public/analytics/route.ts",
    "app/api/public/orders/route.ts",
    "app/api/public/bookings/route.ts",
  ]) {
    const content = source(path);
    assert.doesNotMatch(content, /NODE_ENV\s*===?\s*["']test["']/);
    assert.doesNotMatch(content, /APP_ENV\s*===?\s*["']test["']/);
  }
});

test("owner UI uses effective public visibility rather than the raw persisted flag", () => {
  const dashboard = source("app/dashboard/page.tsx");
  const publication = source("app/actions/publication.ts");
  assert.match(dashboard, /emailVerifiedAt/);
  assert.match(dashboard, /isPublished\s*&&\s*[\s\S]*emailVerifiedAt|emailVerifiedAt\s*&&\s*[\s\S]*isPublished/);
  assert.match(publication, /where:\s*\{\s*id:\s*business\.ownerId,\s*deletedAt:\s*null\s*\}/);
  assert.match(publication, /select:\s*\{\s*emailVerifiedAt:\s*true\s*\}/);
  assert.match(publication, /if\s*\(!owner\?\.emailVerifiedAt\)/);
});

test("published test fixtures declare verification explicitly", () => {
  for (const path of [
    "tests/rc-owner-workflow.spec.ts",
    "tests/transactions-workflow.spec.ts",
    "tests/booking-duration-workflow.spec.ts",
    "tests/public-idempotency-workflow.spec.ts",
    "tests/directory-workflow.spec.ts",
  ]) {
    assert.match(source(path), /emailVerifiedAt:\s*new Date\(\)/, `${path} must seed a verified owner when testing an already-public business`);
  }
});

test("production verification links are canonical without breaking Vercel previews", () => {
  const verification = source("app/lib/email-verification.ts");
  assert.match(verification, /const vercelEnv = String\(process\.env\.VERCEL_ENV \?\? ""\)\.toLowerCase\(\)/);
  assert.match(verification, /vercelEnv === "production" \|\| \(!vercelEnv && process\.env\.NODE_ENV === "production"\)/);
  assert.match(verification, /trustedVerificationOrigin\(String\(process\.env\.VERCEL_URL \?\? ""\), \["vercel\.app"\]\)/);
  assert.match(verification, /hostname\.endsWith\(`\.\$\{suffix\}`\)/);
  assert.match(verification, /return "https:\/\/ir\.sa"/);

  const envExample = source("../../.env.example");
  assert.match(envExample, /RESEND_API_KEY=/);
  assert.match(envExample, /HEE_FROM_EMAIL=/);
});
