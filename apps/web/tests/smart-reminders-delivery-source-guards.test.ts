import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync("app/lib/reminders/delivery-worker.ts", "utf8");
const operations = readFileSync("app/lib/whatsapp/operations-worker.ts", "utf8");
const vercelRunner = readFileSync("app/lib/whatsapp/vercel-operations-runner.ts", "utf8");
const packageJson = readFileSync("package.json", "utf8");

test("reminder delivery claims are leased and ambiguous sends never retry", () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /delivery_unknown/);
  assert.match(worker, /META_NETWORK_OUTCOME_UNKNOWN/);
  assert.match(worker, /REMINDER_DELIVERY_LEASE_LOST/);
  assert.match(worker, /retry_scheduled/);
  assert.match(worker, /MAX_ATTEMPTS = 8/);
});

test("reminder delivery revalidates every tenant and outbound trust boundary", () => {
  assert.match(worker, /d\."businessId" = \$\{delivery\.businessId\}/);
  assert.match(worker, /d\."reminderId" = \$\{delivery\.reminderId\}/);
  assert.match(worker, /d\."connectionId" = \$\{delivery\.connectionId\}/);
  assert.match(worker, /d\."templateId" = \$\{delivery\.templateId\}/);
  assert.match(worker, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(worker, /recipientStillOwnedByBusiness/);
  assert.match(worker, /REMINDER_RECIPIENT_CONSENT_REQUIRED/);
  assert.match(worker, /connectionProvider !== "meta"/);
  assert.match(worker, /templateProvider !== "meta"/);
  assert.match(worker, /templateStatus !== "approved"/);
  assert.match(worker, /reminderTemplateSupportsBodyParameter/);
});

test("reminder delivery shares Meta credential, rate and message persistence controls", () => {
  assert.match(worker, /WhatsAppSendRateBucket/);
  assert.match(worker, /outboundRateLimit/);
  assert.match(worker, /decryptWhatsAppCredential/);
  assert.match(worker, /businessId: delivery\.businessId/);
  assert.match(worker, /metaWhatsAppGraphUrl/);
  assert.match(worker, /messaging_product: "whatsapp"/);
  assert.match(worker, /providerMessageId/);
  assert.match(worker, /whatsAppConversation\.upsert/);
  assert.match(worker, /whatsAppMessage\.upsert/);
  assert.match(worker, /reminder\.delivery\.send/);
  assert.doesNotMatch(worker, /console\.(log|error).*accessToken/);
});

test("operations cycle always schedules reminders before delivering them on both runtimes", () => {
  const scheduleAt = operations.indexOf('"whatsapp:reminder-schedules"');
  const deliveryAt = operations.indexOf('"whatsapp:reminder-deliveries"');
  assert.ok(scheduleAt > 0 && deliveryAt > scheduleAt);
  assert.match(vercelRunner, /case "whatsapp:reminder-schedules"/);
  assert.match(vercelRunner, /case "whatsapp:reminder-deliveries"/);
  assert.match(vercelRunner, /runSmartReminderScheduler/);
  assert.match(vercelRunner, /processNextSmartReminderDelivery/);
  assert.match(packageJson, /"whatsapp:reminder-schedules"/);
  assert.match(packageJson, /"whatsapp:reminder-deliveries"/);
});
