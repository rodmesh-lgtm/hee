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
  assert.match(page, /const params = await searchParams/);
  assert.match(page, /getOwnedBusinessForRead/);
  assert.match(page, /getWhatsAppInbox/);
  assert.doesNotMatch(page, /fetch\(|dangerouslySetInnerHTML/);
});

test("expired customer service windows never present a free-form reply action", () => {
  assert.match(page, /تتطلب رسالة قالب معتمد/);
  assert.match(page, /لا يجوز إرسال نص حر/);
  assert.doesNotMatch(page, /<form[^>]+action=.*reply|sendReplyAction/);
});
