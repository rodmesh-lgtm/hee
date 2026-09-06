import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const care = source("app/lib/whatsapp/care-operations.ts");
const page = source("app/dashboard/whatsapp/inbox/operations/page.tsx");
const layout = source("app/dashboard/whatsapp/inbox/layout.tsx");

test("customer care triage reads remain tenant scoped and bounded", () => {
  assert.match(care, /businessId: input\.businessId/);
  assert.match(care, /WHATSAPP_CARE_OPERATIONS_LIMIT = 100/);
  assert.match(care, /query\.length <= 64/);
  assert.match(care, /WHATSAPP_CARE_FILTERS\.includes/);
});

test("needs-reply is derived from inbound versus outbound activity, not invented unread state", () => {
  assert.match(care, /conversation\.lastInboundAt > conversation\.lastOutboundAt/);
  assert.match(page, /آخر تفاعل وارد لم يتبعه صادر/);
  assert.doesNotMatch(care, /\.unread\b|unreadCount|isUnread|readBy|readAt/i);
  assert.doesNotMatch(page, /operations\.summary\.unread|item\.unread|unreadCount|isUnread/i);
});

test("service-window triage reuses the WhatsApp 24-hour domain contract", () => {
  assert.match(care, /whatsAppCustomerServiceWindow\(conversation\.lastInboundAt, now\)/);
  assert.match(page, /رد مباشر حتى/);
  assert.match(page, /يلزم قالب Meta/);
  assert.match(page, /\/dashboard\/whatsapp\/inbox\?conversation=/);
});

test("operations board does not expose message bodies or pretend unsupported support features", () => {
  assert.doesNotMatch(care, /textBody/);
  assert.doesNotMatch(page, /message\.textBody|errorMessage|errorCode/);
  assert.match(page, /لا تدّعي وجود تعيين موظفين أو SLA أو علامات/);
  assert.match(layout, /لوحة الفرز والمتابعة/);
});
