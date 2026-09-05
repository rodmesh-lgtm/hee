import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("setup page does not present disabled or non-connected Meta connection as active", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/setup/page.tsx", import.meta.url), "utf8");
  assert.match(page, /disabledAt: true/);
  assert.match(page, /connection\?\.status\s*===\s*"connected"\s*&&\s*!connection\.disabledAt/);
  assert.match(page, /الربط متوقف/);
  assert.match(page, /لن تبدأ INFRO إرسال الحملات أو الأتمتة من هذا الرقم حتى يكتمل الربط/);
});

test("setup page explains official linking without exposing provider internals", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/setup/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ربط رقم واتساب الرسمي/);
  assert.match(page, /لا يعتمد الربط على QR أو WhatsApp Web/);
  assert.match(page, /لم تكتمل آخر محاولة ربط/);
  assert.match(page, /aria-live="polite"/);
  assert.doesNotMatch(page, /WABA \/ Phone ID|رمز تشغيلي|envelope مشفر|الحالة: \$\{connection\.status\}/);
  assert.doesNotMatch(page, /latestSession\.status/);
});
