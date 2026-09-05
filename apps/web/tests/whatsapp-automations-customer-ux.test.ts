import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");

test("WhatsApp automations use customer-facing Arabic while preserving consent safety", () => {
  assert.match(source, /حوّل المواعيد والطلبات والسلال والأحداث القادمة/);
  assert.match(source, /تُفحص الموافقة والانسحاب والاتصال والقالب/);
  assert.match(source, /سيبدأ كمسودة/);
  assert.match(source, /قد تترتب رسوم Meta/);
  assert.match(source, /وجود رقم العميل أو طلب سابق وحده لا يُعد موافقة تسويقية/);
  assert.match(source, /بانتظار موعدها/);
  assert.match(source, /محاولات الإرسال/);
  assert.match(source, /ابدأ الآن/);
  assert.match(source, /href="#automation-create"/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /Durable Queue|عامل مستقل|Opt-out|وظائف الإرسال|تم تنفيذ activate|تم تنفيذ pause|تم تنفيذ resume|href="#"/);
});
