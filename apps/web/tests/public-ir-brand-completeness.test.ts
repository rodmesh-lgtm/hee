import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicProfile = readFileSync(new URL("../components/public-business-page-v10-light.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../app/preview/page.tsx", import.meta.url), "utf8");
const passwordReset = readFileSync(new URL("../app/actions/password-reset.ts", import.meta.url), "utf8");
const emailVerification = readFileSync(new URL("../app/lib/email-verification.ts", import.meta.url), "utf8");

test("public business profile exposes only iR customer branding", () => {
  assert.match(publicProfile, /aria-label="iR - الصفحة الرئيسية"/);
  assert.match(publicProfile, />iR<\/Link>/);
  assert.match(publicProfile, /value=\{business\.isVerified \? "موثق" : "iR"\}/);
  assert.doesNotMatch(publicProfile, />HEE</);
  assert.doesNotMatch(publicProfile, /aria-label="HEE/);
});

test("owner preview browser title uses iR", () => {
  assert.match(preview, /title: "معاينة الصفحة \| iR"/);
  assert.doesNotMatch(preview, /\| HEE/);
});

test("transactional account emails use iR without changing the ir.sa trust origin", () => {
  assert.match(passwordReset, /return "https:\/\/ir\.sa"/);
  assert.match(emailVerification, /return "https:\/\/ir\.sa"/);
  assert.match(passwordReset, /subject: "استعادة كلمة مرور iR"/);
  assert.match(emailVerification, /subject: "تأكيد بريد حساب iR"/);
  assert.match(passwordReset, /"User-Agent": "iR\/1\.0"/);
  assert.match(emailVerification, /"User-Agent": "iR\/1\.0"/);
  assert.doesNotMatch(passwordReset, /حساب HEE|إدارة HEE|HEE\/1\.0/);
  assert.doesNotMatch(emailVerification, /حساب HEE|HEE\/1\.0/);
});
