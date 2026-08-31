import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/contacts/page.tsx", import.meta.url), "utf8");

test("contacts page uses customer-facing language and actionable empty states", () => {
  assert.match(page, /ألغوا الاشتراك/);
  assert.match(page, /حماية موافقة المستلمين/);
  assert.match(page, /استيراد أول ملف/);
  assert.match(page, /لا توجد عمليات استيراد بعد/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /contactSourceLabel/);
  assert.doesNotMatch(page, />[^<]*(Opt-out|snapshot|طابور الاستيراد الآمن|E\.164)[^<]*</i);
});

test("contacts page relies on shared WhatsApp navigation rather than a duplicate hub link", () => {
  const headerEnd = page.indexOf("</header>");
  assert.ok(headerEnd > 0);
  assert.doesNotMatch(page.slice(0, headerEnd), /href="\/dashboard\/whatsapp"/);
});
