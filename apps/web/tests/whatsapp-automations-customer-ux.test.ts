import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");

test("WhatsApp automations use customer-facing Arabic while preserving consent safety", () => {
  assert.match(source, /أرسل رسائل تلقائية عند حدوث مواعيد أو طلبات أو سلال متروكة/);
  assert.match(source, /عدم إلغائه الاشتراك/);
  assert.match(source, /تُحفظ أولًا كمسودة/);
  assert.match(source, /قد تترتب رسوم Meta فعلية/);
  assert.match(source, /وجود رقم العميل أو طلب سابق لا يُعد موافقة تسويقية/);
  assert.match(source, /رسائل بانتظار موعدها/);
  assert.match(source, /محاولات الإرسال/);
  assert.match(source, /ابدأ من النموذج أعلاه/);
  assert.match(source, /href="#automation-create"/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /Durable Queue|عامل مستقل|Opt-out|وظائف الإرسال|تم تنفيذ activate|تم تنفيذ pause|تم تنفيذ resume|href="#"/);
});
