import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828180000_whatsapp_abandoned_cart_lifecycle/migration.sql");
const contract = read("app/lib/qa-database-contract.ts");
const route = read("app/api/whatsapp/automations/carts/route.ts");
const lifecycle = read("app/lib/whatsapp/automation-cart-lifecycle.ts");
const processor = read("app/lib/whatsapp/automation-processor.ts");
const delivery = read("app/lib/whatsapp/automation-delivery-worker.ts");
const page = read("app/dashboard/whatsapp/automations/page.tsx");

test("cart state and transition inbox are durable and tenant constrained", () => {
  assert.match(schema, /model WhatsAppAutomationCart \{/);
  assert.match(schema, /model WhatsAppAutomationCartEvent \{/);
  assert.match(schema, /@@unique\(\[businessId, cartId\], map: "WhatsAppAutomationCart_business_cart_unique"\)/);
  assert.match(migration, /WhatsAppAutomationCart_state_check/);
  assert.match(migration, /WhatsAppAutomationCartEvent_outcome_check/);
  assert.match(migration, /FOREIGN KEY \("contactId","businessId"\)/g);
  assert.match(migration, /FOREIGN KEY \("apiKeyId","businessId"\)/);
  assert.match(migration, /FOREIGN KEY \("businessId","cartId"\)/);
  assert.match(contract, /20260828180000_whatsapp_abandoned_cart_lifecycle/);
});

test("trusted cart ingress is authenticated, bounded and never calls Meta", () => {
  assert.match(route, /authenticateWhatsAppAutomationApiRequest\(\{ request, scope: "carts" \}\)/);
  assert.match(route, /readBoundedJson\(request, 16 \* 1024\)/);
  assert.match(route, /\^\\\+\[1-9\]\\d\{7,14\}\$/);
  assert.match(route, /occurredAt > new Date\(now\.getTime\(\) \+ 5 \* 60_000\)/);
  assert.match(route, /occurredAt < new Date\(now\.getTime\(\) - 30 \* 24 \* 60 \* 60_000\)/);
  assert.doesNotMatch(route, /fetch\(/);
  assert.doesNotMatch(lifecycle, /fetch\(/);
  assert.doesNotMatch(lifecycle, /graph\.facebook\.com/);
});

test("cart transitions are serialized, monotonic, idempotent and consent aware", () => {
  assert.match(lifecycle, /TransactionIsolationLevel\.Serializable/);
  assert.match(lifecycle, /pg_advisory_xact_lock/);
  assert.match(lifecycle, /businessId_externalEventId/);
  assert.match(lifecycle, /WHATSAPP_AUTOMATION_CART_IDEMPOTENCY_CONFLICT/);
  assert.match(lifecycle, /input\.occurredAt < current\.occurredAt/);
  assert.match(lifecycle, /outcome: stale \? "stale" : "applied"/);
  assert.match(lifecycle, /input\.state === "abandoned"/);
  assert.match(lifecycle, /revokedAt: null, consentedAt: \{ lte: input\.occurredAt \}/);
  assert.match(lifecycle, /contact\.optedOutAt \|\| !consent/);
});

test("abandonment is delayed while recovery and completion cancel pending work", () => {
  assert.match(lifecycle, /processAt: new Date\(input\.occurredAt\.getTime\(\) \+ delayMinutes \* 60_000\)/);
  assert.match(lifecycle, /source: "tenant\.api\.cart"/);
  assert.match(lifecycle, /status: \{ in: \["pending", "retry_scheduled"\] \}/);
  assert.match(lifecycle, /status: "cancelled", lastErrorCode: "CART_NO_LONGER_ABANDONED"/);
  assert.match(route, /"abandoned", "recovered", "completed"/);
  assert.match(page, /name="cartDelayMinutes"/);
});

test("processor and delivery both recheck current tenant cart before work or Meta", () => {
  const processorGuard = processor.indexOf('event.triggerType === "abandoned_cart"');
  const processorJobs = processor.indexOf("whatsAppAutomationJob.upsert", processorGuard);
  assert.ok(processorGuard >= 0 && processorJobs > processorGuard);
  assert.match(processor, /cart_no_longer_abandoned/);
  assert.match(processor, /cart\.contactId !== contact\.id/);
  const deliveryGuard = delivery.indexOf('context.run.event.triggerType === "abandoned_cart"');
  const metaCall = delivery.indexOf("metaWhatsAppGraphUrl", deliveryGuard);
  assert.ok(deliveryGuard >= 0 && metaCall > deliveryGuard);
  assert.match(delivery, /cart\.contactId !== context\.contact\.id/);
  assert.match(delivery, /CART_NO_LONGER_ABANDONED/);
});
