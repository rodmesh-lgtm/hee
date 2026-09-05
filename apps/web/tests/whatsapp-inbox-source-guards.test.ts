import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const inbox = source("app/lib/whatsapp/inbox.ts");
const page = source("app/dashboard/whatsapp/inbox/page.tsx");

test("inbox conversations and selected messages remain tenant scoped", () => {
  assert.match(inbox, /businessId: input\.businessId/g);
  assert.match(inbox, /where: \{ id: selectedId, businessId: input\.businessId \}/);
  assert.match(inbox, /CONVERSATION_LIMIT = 50/);
  assert.match(inbox, /MESSAGE_LIMIT = 100/);
});

test("the dashboard inbox uses server reads and awaits Next.js search params", () => {
  assert.match(page, /params=await searchParams/);
  assert.match(page, /getWhatsAppReadContext\("view"\)/);
  assert.match(page, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(page, /getWhatsAppInbox/);
  assert.doesNotMatch(page, /fetch\(|dangerouslySetInnerHTML/);
});

test("free-form reply action is rendered only while the service window is open", () => {
  assert.match(page, /const serviceOpen=inbox\.selected\?\.serviceWindow\.open\?\?false/);
  assert.match(page, /serviceOpen\?<form action=\{enqueueWhatsAppReplyAction\}/);
  assert.match(page, /الرد الجديد يحتاج قالبًا معتمدًا/);
  assert.match(page, /انتهت مهلة الرد النصي المباشر حسب سياسة واتساب/);
  assert.match(page, /\/dashboard\/whatsapp\/templates/);
});

test("inbox uses customer-facing delivery feedback without leaking internal operations", () => {
  assert.match(page, /تم استلام ردك وسيُرسل بأمان عبر رقم واتساب المرتبط/);
  assert.match(page, /إرسال الرد/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /لا توجد نتائج لهذا البحث/);
  assert.match(page, /لا توجد محادثات بعد/);
  assert.doesNotMatch(page, /Webhook موثّق|طابور الإرسال|بواسطة worker|إضافة للطابور/);
  assert.doesNotMatch(page, /message\.errorCode/);
  assert.doesNotMatch(page, /statusLabel\[message\.status\] \|\| message\.status/);
});
