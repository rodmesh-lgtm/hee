import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scheduler = readFileSync("app/lib/whatsapp/automation-scheduler.ts", "utf8");
const delivery = readFileSync("app/lib/whatsapp/automation-delivery-worker.ts", "utf8");
const operations = readFileSync("app/lib/whatsapp/operations-worker.ts", "utf8");
const automationOperations = readFileSync("app/lib/whatsapp/automation-operations.ts", "utf8");
const page = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");
const packageJson = readFileSync("package.json", "utf8");

test("inactive scheduling is bounded, tenant scoped and based on completed activity", () => {
  assert.match(scheduler, /MAX_AUTOMATIONS_PER_CYCLE = 100/);
  assert.match(scheduler, /MAX_EVENTS_PER_CYCLE = 500/);
  assert.match(scheduler, /c\."businessId" = \$\{automation\.businessId\}/);
  assert.match(scheduler, /o\."businessId" = c\."businessId"/);
  assert.match(scheduler, /b\."businessId" = c\."businessId"/);
  assert.match(scheduler, /o\."status" = 'completed'/);
  assert.match(scheduler, /b\."status" = 'completed'/);
  assert.match(scheduler, /activity\."lastActivityAt" <= \$\{cutoff\}/);
  assert.match(scheduler, /LIMIT \$\{remaining\}/);
});

test("scheduler requires an existing active consent and never infers it from Customer", () => {
  assert.match(scheduler, /INNER JOIN "WhatsAppContact"/);
  assert.match(scheduler, /contact\."optedOutAt" IS NULL/);
  assert.match(scheduler, /INNER JOIN "WhatsAppConsent"/);
  assert.match(scheduler, /consent\."revokedAt" IS NULL/);
  assert.match(scheduler, /consent\."consentedAt" <= \$\{now\}/);
  assert.doesNotMatch(scheduler, /whatsApp(Contact|Consent)\.(create|upsert|update)/);
});

test("one inactivity event is emitted per automation, customer and last activity", () => {
  assert.match(scheduler, /NOT EXISTS/);
  assert.match(scheduler, /event\."automationId" = \$\{automation\.id\}/);
  assert.match(scheduler, /event\."source" = 'ir\.customer\.inactive'/);
  assert.match(scheduler, /event\."subjectId" = activity\."customerId"/);
  assert.match(scheduler, /event\."occurredAt" = activity\."lastActivityAt" \+ \$\{inactiveDays\} \* INTERVAL '1 day'/);
  assert.match(scheduler, /externalEventId: `\$\{automation\.id\}:\$\{candidate\.customerId\}:\$\{candidate\.lastActivityAt\.getTime\(\)\}`/);
  assert.match(scheduler, /ingestWhatsAppAutomationEvents/);
});

test("delivery cancels when the customer becomes active again", () => {
  const guardAt = delivery.indexOf('triggerType === "inactive_customer"');
  const metaAt = delivery.indexOf("metaWhatsAppGraphUrl", guardAt);
  assert.ok(guardAt >= 0 && metaAt > guardAt);
  assert.match(delivery, /businessId: job\.businessId/);
  assert.match(delivery, /updatedAt: \{ gt: previousActivityAt \}/g);
  assert.match(delivery, /CUSTOMER_ACTIVE_AGAIN/);
});

test("durable operations runs schedules before event and delivery workers", () => {
  assert.match(operations, /"whatsapp:automation-schedules"[\s\S]*"whatsapp:automations"[\s\S]*"whatsapp:automation-deliveries"/);
  assert.match(packageJson, /"whatsapp:automation-schedules"/);
});

test("UI and server expose only triggers backed by trusted sources", () => {
  assert.match(page, /disabled=\{!configurableTriggers\.has\(trigger\)\}/);
  assert.match(page, /السلة المتروكة لا تقبل إلا انتقالًا موثوقًا عبر Cart API/);
  assert.match(page, /WHATSAPP_ABANDONED_CART_DELAY_MINUTES/);
  assert.match(page, /حدث API لا يقبل إلا اسم الحدث المضبوط/);
  assert.match(automationOperations, /WHATSAPP_AUTOMATION_TRIGGER_SOURCE_UNAVAILABLE/);
  assert.match(automationOperations, /WHATSAPP_CONFIGURABLE_TRIGGER_TYPES/);
});
