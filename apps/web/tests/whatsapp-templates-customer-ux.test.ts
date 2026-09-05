import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/templates/page.tsx", "utf8");

test("WhatsApp templates page uses customer-facing Arabic states and actions", () => {
  for (const copy of ["قوالب رسائل واتساب", "تحديث القوالب", "معتمدة", "قيد المراجعة", "غير معتمدة", "ابدأ بتحديث قوالب رقمك", "إكمال ربط الرقم", "الانتقال إلى الحملات"]) {
    assert.match(source, new RegExp(copy));
  }
  assert.match(source, /<TemplateStatus status=\{template\.status\}/);
  assert.match(source, /categoryLabel\(template\.category\)/);
  assert.match(source, /languageLabel\(template\.language\)/);
  assert.match(source, /aria-live="polite"/);
});

test("WhatsApp templates page avoids duplicate hub navigation and raw primary status labels", () => {
  assert.doesNotMatch(source, />مركز واتساب</);
  assert.doesNotMatch(source, /label="Approved"/);
  assert.doesNotMatch(source, /label="Pending"/);
  assert.doesNotMatch(source, /label="Rejected"/);
  assert.doesNotMatch(source, />\{template\.status\}</);
});
