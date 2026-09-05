import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync("app/lib/reminders/delivery-worker.ts", "utf8");
const reminderOperations = readFileSync("app/lib/reminders/operations.ts", "utf8");
const operations = readFileSync("app/lib/whatsapp/operations-worker.ts", "utf8");
const vercelRunner = readFileSync("app/lib/whatsapp/vercel-operations-runner.ts", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const migration = readFileSync("prisma/migrations/20260905133000_add_smart_reminders_foundation/migration.sql", "utf8");
const actions = readFileSync("app/actions/smart-reminders.ts", "utf8");
const createForm = readFileSync("components/dashboard/smart-reminder-create-form.tsx", "utf8");

test("reminder delivery claims are leased and ambiguous sends never retry", () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /delivery_unknown/);
  assert.match(worker, /META_NETWORK_OUTCOME_UNKNOWN/);
  assert.match(worker, /REMINDER_DELIVERY_LEASE_LOST/);
  assert.match(worker, /retry_scheduled/);
  assert.match(worker, /MAX_ATTEMPTS\s*=\s*8/);
});

test("reminder delivery revalidates every tenant and outbound trust boundary", () => {
  assert.match(worker, /d\."businessId"\s*=\s*\$\{delivery\.businessId\}/);
  assert.match(worker, /d\."reminderId"\s*=\s*\$\{delivery\.reminderId\}/);
  assert.match(worker, /d\."connectionId"\s*=\s*\$\{delivery\.connectionId\}/);
  assert.match(worker, /d\."templateId"\s*=\s*\$\{delivery\.templateId\}/);
  assert.match(worker, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(worker, /recipientStillOwnedByBusiness/);
  assert.match(worker, /REMINDER_RECIPIENT_CONSENT_REQUIRED/);
  assert.match(worker, /connectionProvider\s*!==\s*"meta"/);
  assert.match(worker, /templateProvider\s*!==\s*"meta"/);
  assert.match(worker, /templateStatus\s*!==\s*"approved"/);
  assert.match(worker, /reminderTemplateSupportsBodyParameter/);
});

test("reminder opt-in stays reminder-specific and never widens marketing consent", () => {
  assert.match(migration, /"recipientConsentedAt" TIMESTAMP\(3\) NOT NULL/);
  assert.match(migration, /"recipientConsentEvidence" TEXT NOT NULL/);
  assert.match(reminderOperations, /recipientConsentAccepted:\s*boolean/);
  assert.match(reminderOperations, /dashboard_explicit_reminder_opt_in_v1/);
  assert.match(actions, /form\.get\("recipientConsentAccepted"\)\s*===\s*"on"/);
  assert.match(createForm, /name="recipientConsentAccepted"/);
  assert.match(createForm, /recipientConsentAccepted" required/);
  assert.match(worker, /recipientConsentEvidence/);
  assert.match(worker, /recipientConsentedAt/);
  assert.match(worker, /dashboard_explicit_reminder_opt_in_v1/);
  assert.match(worker, /optedOutAt/);
  assert.doesNotMatch(reminderOperations, /whatsAppConsent\.(create|upsert|update)/);
  assert.doesNotMatch(worker, /whatsAppConsent\.findFirst/);
});

test("reminder lifecycle mutations serialize against in-flight deliveries", () => {
  assert.match(reminderOperations, /FOR UPDATE/);
  assert.match(reminderOperations, /TransactionIsolationLevel\.Serializable/);
  assert.match(reminderOperations, /REMINDER_DELIVERY_IN_PROGRESS/);
  assert.match(reminderOperations, /status"\s+IN\s+\('queued','retry_scheduled'\)/);
  assert.match(reminderOperations, /cancelQueuedDeliveries/);
  assert.match(reminderOperations, /assertNoInFlightDelivery/);
});

test("reminder delivery shares Meta credential, rate and message persistence controls", () => {
  assert.match(worker, /WhatsAppSendRateBucket/);
  assert.match(worker, /outboundRateLimit/);
  assert.match(worker, /decryptWhatsAppCredential/);
  assert.match(worker, /businessId:\s*delivery\.businessId/);
  assert.match(worker, /metaWhatsAppGraphUrl/);
  assert.match(worker, /messaging_product:\s*"whatsapp"/);
  assert.match(worker, /providerMessageId/);
  assert.match(worker, /whatsAppConversation\.upsert/);
  assert.match(worker, /whatsAppMessage\.upsert/);
  assert.match(worker, /reminder\.delivery\.send/);
  assert.doesNotMatch(worker, /console\.(log|error).*accessToken/);
});

test("confirmed one-time delivery completes the reminder atomically while recurring reminders stay scheduled", () => {
  assert.match(worker, /context\.recurrenceType === "once"/);
  assert.match(worker, /context\.nextOccurrenceAt === null/);
  assert.match(worker, /SET "status"='completed'/);
  assert.match(worker, /"recurrenceType"='once'/);
  assert.match(worker, /"nextOccurrenceAt" IS NULL/);
  assert.match(worker, /action:"reminder\.complete"/);
  const completionAt = worker.indexOf('SET "status"=\'completed\'');
  const providerSuccessAt = worker.indexOf('SET "status"=\'sent\'');
  assert.ok(providerSuccessAt > 0 && completionAt > providerSuccessAt);
});

test("non-success delivery transitions are privacy-safe audited", () => {
  assert.match(worker, /action: "reminder\.delivery\.transition"/);
  assert.match(worker, /deliveryStatus: status/);
  assert.match(worker, /reason: errorCode \?\? null/);
  assert.doesNotMatch(worker, /metadata:\s*\{[^}]*recipientPhoneE164/);
  assert.doesNotMatch(worker, /metadata:\s*\{[^}]*body/);
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
