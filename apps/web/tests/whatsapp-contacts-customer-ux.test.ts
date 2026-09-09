import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/contacts/page.tsx", import.meta.url), "utf8");

test("contacts page uses customer-facing audience language and actionable empty states", () => {
  assert.match(page, /مساحة الجمهور والموافقات/);
  assert.match(page, /الموافقة ليست مجرد رقم في قاعدة البيانات/);
  assert.match(page, /يحتاج موافقة/);
  assert.match(page, /Opt-out/);
  assert.match(page, /استيراد ملف/);
  assert.match(page, /لا توجد عمليات استيراد بعد/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /contactSourceLabel/);
  assert.doesNotMatch(page, />[^<]*(snapshot|طابور الاستيراد الآمن)[^<]*</i);
});

test("contacts page relies on shared WhatsApp navigation rather than a duplicate hub link", () => {
  const headerEnd = page.indexOf("</header>");
  assert.ok(headerEnd > 0);
  assert.doesNotMatch(page.slice(0, headerEnd), /href="\/dashboard\/whatsapp"/);
});
