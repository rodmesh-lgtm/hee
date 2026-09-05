import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const verificationEmail = read("../app/lib/email-verification.ts");
const verificationActions = read("../app/actions/email-verification.ts");
const verificationPage = read("../app/verify-email/page.tsx");
const passwordReset = read("../app/actions/password-reset.ts");

test("customer-facing verification email uses INFRO identity", () => {
  assert.match(verificationEmail, /subject: "تأكيد بريد حساب INFRO"/);
  assert.match(verificationEmail, /User-Agent": "INFRO\/1\.0"/);
  assert.match(verificationEmail, /infro-email-verify-/);
  assert.match(verificationEmail, /background:#07181b/);
  assert.doesNotMatch(verificationEmail, /تأكيد بريد حساب HEE|لبريد حساب HEE|User-Agent": "HEE\/1\.0"/);
});

test("customer-facing password reset uses INFRO identity", () => {
  assert.match(passwordReset, /subject: "استعادة كلمة مرور INFRO"/);
  assert.match(passwordReset, /حساب INFRO/);
  assert.match(passwordReset, /إدارة INFRO/);
  assert.match(passwordReset, /User-Agent": "INFRO\/1\.0"/);
  assert.match(passwordReset, /infro-reset-/);
  assert.doesNotMatch(passwordReset, /استعادة كلمة مرور HEE|حساب HEE|إدارة HEE|User-Agent": "HEE\/1\.0"/);
});

test("verification support and page metadata no longer expose HEE", () => {
  assert.match(verificationActions, /إدارة INFRO/);
  assert.doesNotMatch(verificationActions, /إدارة HEE/);
  assert.match(verificationPage, /تأكيد البريد الإلكتروني \| INFRO/);
  assert.match(verificationPage, /INFRO ACCOUNT SECURITY/);
  assert.doesNotMatch(verificationPage, /\| HEE|violet|#5b3fd6|#5d49cc|#6543ce/);
});
