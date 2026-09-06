import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("prisma/migrations/20260906053000_decouple_reminder_channels/migration.sql", "utf8");
const senderMigration = readFileSync("prisma/migrations/20260906113000_platform_reminder_sender/migration.sql", "utf8");
const operations = readFileSync("app/lib/reminders/operations.ts", "utf8");
const scheduler = readFileSync("app/lib/reminders/scheduler.ts", "utf8");
const worker = readFileSync("app/lib/reminders/delivery-worker.ts", "utf8");
const form = readFileSync("components/dashboard/smart-reminder-create-form.tsx", "utf8");

test("non-WhatsApp reminders remain independent and WhatsApp sender modes are database-enforced", () => {
  assert.match(migration, /ALTER COLUMN "connectionId" DROP NOT NULL/);
  assert.match(migration, /ALTER COLUMN "templateId" DROP NOT NULL/);
  assert.match(migration, /ALTER COLUMN "recipientPhoneE164" DROP NOT NULL/);
  assert.match(senderMigration, /SmartReminder_whatsapp_binding_required/);
  assert.match(senderMigration, /SmartReminderDelivery_whatsapp_binding_required/);
  assert.match(senderMigration, /"whatsappSenderMode" IN \('tenant','platform'\)/);
  assert.match(senderMigration, /"whatsappSenderMode" = 'platform'/);
});

test("creating email or in-app reminders never performs fallback Meta lookups", () => {
  assert.match(operations, /if \(wantsWhatsApp\)/);
  assert.match(operations, /let connectionId: string \| null = null/);
  assert.match(operations, /let templateId: string \| null = null/);
  assert.match(operations, /let recipientPhoneE164: string \| null = null/);
  assert.doesNotMatch(operations, /REMINDER_STORAGE_BINDING_REQUIRED/);
  assert.doesNotMatch(operations, /fallbackTemplate/);
});

test("scheduler requires tenant Meta bindings only for legacy tenant sender mode", () => {
  assert.match(scheduler, /channel === "whatsapp" && senderMode === "tenant"/);
  assert.match(scheduler, /senderMode === "tenant" \? reminder\.connectionId : null/);
  assert.match(scheduler, /senderMode === "tenant" \? reminder\.templateId : null/);
});

test("email and in-app delivery load context before WhatsApp sender routing", () => {
  assert.match(worker, /LEFT JOIN "WhatsAppConnection"/);
  assert.match(worker, /LEFT JOIN "WhatsAppTemplate"/);
  const emailAt = worker.indexOf('delivery.channel === "email"');
  const inAppAt = worker.indexOf('delivery.channel === "in_app"');
  const platformAt = worker.indexOf('delivery.whatsappSenderMode === "platform"');
  assert.ok(emailAt > 0 && inAppAt > emailAt && platformAt > inAppAt);
});

test("the create form keeps non-WhatsApp channels available when INFRO REMINDER is unavailable", () => {
  assert.match(form, /whatsAppAvailable: boolean/);
  assert.match(form, /disabled=\{!whatsAppAvailable\}/);
  assert.match(form, /value="in_app" defaultChecked=\{!whatsAppAvailable\}/);
  assert.match(form, /البريد أو إشعارات INFRO/);
});
