import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const emailVerification = readFileSync(new URL("../app/actions/email-verification.ts", import.meta.url), "utf8");
const digitalIdentity = readFileSync(new URL("../app/actions/digital-identity.ts", import.meta.url), "utf8");
const digitalIdentityPage = readFileSync(new URL("../app/dashboard/digital-identity/page.tsx", import.meta.url), "utf8");

test("email verification rate-limit redirect happens after the limiter try/catch", () => {
  assert.match(emailVerification, /let rateAllowed = false;[\s\S]*rateAllowed = rate\.allowed;[\s\S]*if \(!rateAllowed\) redirect\("\/verify-email\?status=rate-limited"\);/);
  assert.doesNotMatch(emailVerification, /try \{[\s\S]*if \(!rate\.allowed\) redirect\("\/verify-email\?status=rate-limited"\);[\s\S]*\} catch/);
});

test("company profile rate-limit redirect is not swallowed as a limiter failure", () => {
  assert.match(digitalIdentity, /let rateAllowed = false;[\s\S]*rateAllowed = rate\.allowed;[\s\S]*if \(!rateAllowed\) redirect\("\/dashboard\/digital-identity\?profile=rate-limited"\);/);
  assert.match(digitalIdentityPage, /profile === "rate-limited"/);
  assert.match(digitalIdentityPage, /تم تجاوز عدد محاولات رفع الملف مؤقتًا/);
});

test("company profile upload preserves intentional Next redirects", () => {
  assert.match(digitalIdentity, /startsWith\("NEXT_REDIRECT"\)\) throw error;/);
});
