import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const homepage = readFileSync(resolve(process.cwd(), "components/homepage-professional.tsx"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");

test("homepage exposes a navigable and visible About iR section", () => {
  assert.match(homepage, /href="#about">عن iR/);
  assert.match(homepage, /<section id="about" aria-labelledby="about-title"/);
  assert.match(homepage, /iR مشروع تقني سعودي/);
  assert.match(homepage, /هوية أعمال رقمية موثوقة ومنظمة/);
});

test("About section accurately identifies the official Meta integration", () => {
  assert.match(homepage, /WhatsApp Business Platform \/ Cloud API الرسمي من Meta/);
  assert.match(homepage, /حساب WABA ورقمها الخاص/);
  assert.match(homepage, /موافقة العملاء والخصوصية وإلغاء الاشتراك/);
  assert.doesNotMatch(homepage, /WhatsApp Web|رمز QR|مكتبة غير رسمية/);
  assert.match(page, /WhatsApp Business Platform الرسمية للأعمال/);
});

test("official contact number is visible and actionable without ambiguity", () => {
  assert.match(homepage, />0564212464<\/a>/);
  assert.match(homepage, /href="tel:\+966564212464"/);
  assert.match(homepage, /href="https:\/\/wa\.me\/966564212464"/);
  assert.equal((homepage.match(/0564212464/g) ?? []).length, 1);
});
