import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const care = source("app/lib/whatsapp/care-operations.ts");
const page = source("app/dashboard/whatsapp/inbox/operations/page.tsx");
const layout = source("app/dashboard/whatsapp/inbox/layout.tsx");
const management = source("app/lib/whatsapp/care-management.ts");
const migration = source("prisma/migrations/20260920122000_whatsapp_care_assignment_sla/migration.sql");

test("customer care triage reads remain tenant scoped and bounded", () => {
  assert.match(care, /businessId: input\.businessId/);
  assert.match(care, /WHATSAPP_CARE_OPERATIONS_LIMIT = 100/);
  assert.match(care, /query\.length <= 64/);
  assert.match(care, /WHATSAPP_CARE_FILTERS\.includes/);
});

test("customer care excludes the central reminder sender just like the inbox", () => {
  assert.match(care, /platformPhoneNumberId = getInfroReminderWhatsAppPhoneNumberId\(\)/);
  assert.match(care, /NOT: \{ phoneNumberId: platformPhoneNumberId \}/);
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

test("operations board does not expose message bodies and uses real assignment and SLA fields", () => {
  assert.doesNotMatch(care, /textBody/);
  assert.doesNotMatch(page, /message\.textBody|errorMessage|errorCode/);
  assert.match(page, /operations\.summary\.overdue/);
  assert.match(page, /item\.assignee\?\.name/);
  assert.match(layout, /لوحة الفرز والمتابعة/);
});

test("assignment is tenant checked in application, database trigger and audit log", () => {
  assert.match(management, /id: input\.businessId/);
  assert.match(management, /members: \{ some: \{ userId: input\.assignedToUserId, status: "active"/);
  assert.match(management, /id_businessId/);
  assert.match(management, /action: "inbox\.care\.update"/);
  assert.match(management, /database: tx/);
  assert.match(migration, /validate_whatsapp_conversation_assignee/);
  assert.match(migration, /bm\."businessId" = NEW\."businessId"/);
  assert.match(migration, /bm\."status" = 'active'/);
  assert.match(migration, /bm\."role" IN \('admin', 'support'\)/);
  assert.match(migration, /BusinessMember_clear_ineligible_whatsapp_assignee/);
  assert.match(migration, /SET "assignedToUserId" = NULL, "assignedAt" = NULL/);
});

test("SLA state is persisted from inbound activity and completed by an actual reply", () => {
  const webhook = source("app/lib/whatsapp/webhook-processor.ts");
  const replyWorker = source("app/lib/whatsapp/reply-worker.ts");
  assert.match(webhook, /slaDueAt: whatsAppCareSlaDueAt/);
  assert.match(webhook, /slaRespondedAt: null/);
  assert.match(replyWorker, /slaRespondedAt: now/);
  assert.match(migration, /WhatsAppConversation_priority_check/);
});
