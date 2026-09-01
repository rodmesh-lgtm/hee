import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicProfile = readFileSync(new URL("../components/public-business-page-v10-light.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../app/preview/page.tsx", import.meta.url), "utf8");
const passwordReset = readFileSync(new URL("../app/actions/password-reset.ts", import.meta.url), "utf8");
const emailVerification = readFileSync(new URL("../app/lib/email-verification.ts", import.meta.url), "utf8");
const terms = readFileSync(new URL("../app/terms/page.tsx", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
const adminLogin = readFileSync(new URL("../app/admin-login/page.tsx", import.meta.url), "utf8");
const billingTax = readFileSync(new URL("../app/lib/billing-tax-core.ts", import.meta.url), "utf8");

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

test("legal and central admin entry surfaces expose iR, not legacy UI branding", () => {
  assert.match(terms, /منصة iR/);
  assert.match(privacy, /منصة iR|تتعامل iR/);
  assert.match(adminLogin, /iR CONTROL PLANE/);
  assert.match(adminLogin, /لمشغلي iR فقط/);
  assert.match(adminLogin, /aria-live="assertive"/);
  assert.match(adminLogin, /aria-busy=\{pending\}/);
  for (const source of [terms, privacy, adminLogin]) assert.doesNotMatch(source, />HEE|منصة HEE|مشغلي HEE/);
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

test("new receipt snapshots use iR identifiers", () => {
  assert.match(billingTax, /receiptNumber: `iR-R-\$\{billingId\}`/);
  assert.match(billingTax, /sellerLegalName: legalName \|\| "iR Test Seller"/);
  assert.doesNotMatch(billingTax, /HEE-R-|HEE Test Seller/);
});
