import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const transactions = readFileSync("app/actions/transactions.ts", "utf8");
const producer = readFileSync("app/lib/whatsapp/automation-event-producer.ts", "utf8");
const processor = readFileSync("app/lib/whatsapp/automation-processor.ts", "utf8");
const operations = readFileSync("app/lib/whatsapp/automation-operations.ts", "utf8");
const page = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");

test("order status transition and durable automation event commit atomically", () => {
  assert.match(transactions, /TransactionIsolationLevel\.Serializable/);
  assert.match(transactions, /FROM "Order" WHERE "id" = \$\{id\} AND "businessId" = \$\{business\.id\} FOR UPDATE/);
  assert.match(transactions, /businessId: business\.id/);
  assert.match(transactions, /updated\.count !== 1/);
  assert.match(transactions, /emitInternalWhatsAppAutomationEvent/);
  assert.match(transactions, /source: "ir\.order\.status"/);
  assert.match(transactions, /subjectType: `order\.status\.\$\{nextStatus\}`/);
});

test("internal producer never creates contacts or infers consent from an order", () => {
  assert.match(producer, /normalizeE164\(input\.customerPhone, "966"\)/);
  assert.match(producer, /businessId: input\.businessId, phoneE164/);
  assert.match(producer, /status: "active"/);
  assert.match(producer, /automationMatchesEvent/);
  assert.match(producer, /ingestWhatsAppAutomationEvent/);
  assert.doesNotMatch(producer, /whatsAppContact\.(create|upsert|update)/);
  assert.doesNotMatch(producer, /whatsAppConsent\.(create|upsert|update)/);
});

test("order automations are status filtered in UI, activation and processing", () => {
  assert.match(page, /WHATSAPP_ORDER_EVENT_STATUSES/);
  assert.match(page, /name="orderStatus"/);
  assert.match(operations, /buildAutomationTriggerConfig/);
  assert.match(operations, /readAutomationTriggerConfig/);
  assert.match(processor, /automationMatchesEvent/);
});
