import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("prisma/migrations/20260906050000_add_multichannel_reminders/migration.sql", "utf8");
const senderMigration = readFileSync("prisma/migrations/20260906113000_platform_reminder_sender/migration.sql", "utf8");
const optOutMigration = readFileSync("prisma/migrations/20260906114500_infro_reminder_global_opt_out/migration.sql", "utf8");
const receiptMigration = readFileSync("prisma/migrations/20260906121500_platform_reminder_receipts/migration.sql", "utf8");
const domain = readFileSync("app/lib/reminders/domain.ts", "utf8");
const actions = readFileSync("app/actions/smart-reminders.ts", "utf8");
const scheduler = readFileSync("app/lib/reminders/scheduler.ts", "utf8");
const worker = readFileSync("app/lib/reminders/delivery-worker.ts", "utf8");
const webhookProcessor = readFileSync("app/lib/whatsapp/webhook-processor.ts", "utf8");
const form = readFileSync("components/dashboard/smart-reminder-create-form.tsx", "utf8");
const platform = readFileSync("app/lib/reminders/platform-whatsapp.ts", "utf8");

test("multi-channel persistence is bounded and independently idempotent", () => {
  assert.match(migration, /"deliveryChannels" TEXT\[\]/);
  assert.match(migration, /whatsapp','email','in_app/);
  assert.match(migration, /"channel" TEXT NOT NULL DEFAULT 'whatsapp'/);
  assert.match(migration, /SmartReminderDelivery_occurrence_channel_unique/);
  assert.match(migration, /SmartReminderNotification_delivery_unique/);
  assert.match(domain, /infro-reminder-v2/);
  assert.match(domain, /input\.channel\s*\?\?\s*"whatsapp"/);
});

test("customer explicitly selects channels and central WhatsApp keeps reminder-specific consent", () => {
  assert.match(form, /name="deliveryChannels"\s+value="whatsapp"/);
  assert.match(form, /name="deliveryChannels"\s+value="email"/);
  assert.match(form, /name="deliveryChannels"\s+value="in_app"/);
  assert.match(form, /INFRO REMINDER/);
  assert.match(actions, /form\.getAll\("deliveryChannels"\)/);
  assert.match(actions, /wantsWhatsApp\s*&&\s*!recipientConsentAccepted/);
  assert.match(actions, /infroReminderWhatsAppReady/);
  assert.match(actions, /whatsappSenderMode:\s*"platform"/);
  assert.doesNotMatch(actions, /assertWhatsAppReminderAccess/);
});

test("scheduler fans one occurrence out by channel and sender mode without duplicate jobs", () => {
  assert.match(scheduler, /normalizeReminderChannels\(reminder\.deliveryChannels\)/);
  assert.match(scheduler, /for\s*\(\s*const channel of channels\s*\)/);
  assert.match(scheduler, /reminderDeliveryIdempotencyKey/);
  assert.match(scheduler, /senderMode === "tenant"/);
  assert.match(scheduler, /"whatsappSenderMode"/);
  assert.match(scheduler, /ON CONFLICT \("idempotencyKey"\) DO NOTHING/);
});

test("central sender is Meta-only, fail-closed, rate-limited and globally opt-out aware", () => {
  assert.match(senderMigration, /whatsappSenderMode/);
  assert.match(senderMigration, /InfroReminderWhatsAppRateBucket/);
  assert.match(optOutMigration, /InfroReminderWhatsAppOptOut/);
  assert.match(platform, /INFRO_REMINDER_WHATSAPP_ENABLED/);
  assert.match(platform, /INFRO_REMINDER_WHATSAPP_WABA_ID/);
  assert.match(platform, /INFRO_REMINDER_WHATSAPP_PHONE_NUMBER_ID/);
  assert.match(platform, /INFRO_REMINDER_WHATSAPP_ACCESS_TOKEN/);
  assert.match(platform, /graph\.facebook\.com/);
  assert.match(worker, /platformRecipientOptedOut/);
  assert.match(worker, /InfroReminderWhatsAppOptOut/);
  assert.match(worker, /InfroReminderWhatsAppRateBucket/);
  assert.match(worker, /sendPlatformWhatsAppReminder/);
  assert.match(worker, /messaging_product:\s*"whatsapp"/);
});

test("platform reminder traffic never enters tenant WhatsAppConversation or WhatsAppMessage storage", () => {
  const platformSendStart = worker.indexOf("async function sendPlatformWhatsAppReminder");
  const tenantSendStart = worker.indexOf("async function sendTenantWhatsAppReminder");
  const platformSend = worker.slice(platformSendStart, tenantSendStart);
  assert.ok(platformSendStart >= 0 && tenantSendStart > platformSendStart);
  assert.doesNotMatch(platformSend, /persistTenantWhatsAppMessage|whatsAppConversation|whatsAppMessage/);
  assert.match(worker, /async function persistTenantWhatsAppMessage/);
  assert.match(worker, /whatsappSenderMode !== "tenant"/);
  assert.match(worker, /await persistTenantWhatsAppMessage\(database/);

  const platformStatusStart = webhookProcessor.indexOf("async function processPlatformStatuses");
  const tenantStatusStart = webhookProcessor.indexOf("async function processStatuses");
  const platformStatuses = webhookProcessor.slice(platformStatusStart, tenantStatusStart);
  assert.ok(platformStatusStart >= 0 && tenantStatusStart > platformStatusStart);
  assert.doesNotMatch(platformStatuses, /whatsAppMessage|whatsAppConversation/);
  assert.match(platformStatuses, /applyPlatformReminderFailureReceipt/);
  assert.match(platformStatuses, /applyPlatformReminderPositiveReceipt/);
  assert.match(webhookProcessor, /"whatsappSenderMode"='platform'/);
  assert.match(webhookProcessor, /"whatsappSenderMode"='tenant'/);
});

test("central reminder delivery and read receipts stay on SmartReminderDelivery", () => {
  assert.match(receiptMigration, /ADD COLUMN "deliveredAt" TIMESTAMP\(3\)/);
  assert.match(receiptMigration, /ADD COLUMN "readAt" TIMESTAMP\(3\)/);
  assert.match(receiptMigration, /SmartReminderDelivery_platform_receipt_idx/);
  assert.match(webhookProcessor, /SET "deliveredAt"=COALESCE\("deliveredAt", \$\{at\}\)/);
  assert.match(webhookProcessor, /"readAt"=COALESCE\("readAt", \$\{at\}\)/);
  assert.match(webhookProcessor, /receipt\.status === "delivered" \|\| receipt\.status === "read"/);
});

test("email and in-app remain independent while legacy tenant Meta safeguards stay intact", () => {
  assert.match(worker, /delivery\.channel === "email"/);
  assert.match(worker, /REMINDER_FROM_EMAIL/);
  assert.match(worker, /https:\/\/api\.resend\.com\/emails/);
  assert.match(worker, /Idempotency-Key/);
  assert.match(worker, /delivery\.channel === "in_app"/);
  assert.match(worker, /SmartReminderNotification/);
  assert.match(worker, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(worker, /decryptWhatsAppCredential/);
  assert.match(worker, /templateStatus !== "approved"/);
});
