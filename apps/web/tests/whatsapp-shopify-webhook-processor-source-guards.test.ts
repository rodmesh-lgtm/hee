import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828213000_shopify_webhook_processor/migration.sql");
const processor = read("app/lib/whatsapp/shopify-webhook-processor.ts");
const lifecycle = read("app/lib/whatsapp/automation-cart-lifecycle.ts");
const operations = read("app/lib/whatsapp/operations-worker.ts");
const contract = read("app/lib/qa-database-contract.ts");

test("Shopify inbox processing is leased, retryable and crash recoverable", () => {
  assert.match(schema, /status String @default\("pending"\)/);
  assert.match(schema, /leaseExpiresAt DateTime\?/);
  assert.match(migration, /retry_scheduled/);
  assert.match(migration, /WhatsAppShopifyWebhookEvent_lease_check/);
  assert.match(processor, /FOR UPDATE SKIP LOCKED/);
  assert.match(processor, /"status" = 'processing' AND "leaseExpiresAt" < \$\{now\}/);
  assert.match(processor, /MAX_ATTEMPTS = 8/);
  assert.match(processor, /applyWhatsAppAutomationCartTransitionInTransaction/);
  assert.match(processor, /TransactionIsolationLevel\.Serializable/);
  assert.match(operations, /whatsapp:shopify-webhooks/);
  assert.match(contract, /20260828213000_shopify_webhook_processor/);
});

test("Shopify cart mapping remains tenant-bound and never creates contacts or consent", () => {
  assert.match(migration, /integration_tenant_fkey/);
  assert.match(migration, /WhatsAppAutomationCartEvent_actor_check/);
  assert.match(processor, /businessId_phoneE164/);
  assert.match(processor, /businessId_cartId/);
  assert.match(lifecycle, /provider" = 'shopify' AND "status" = 'active'/);
  assert.match(lifecycle, /shopifyTerminal/);
  assert.match(lifecycle, /shopifySameOrLower/);
  assert.doesNotMatch(processor, /whatsApp(Contact|Consent)\.create/);
  assert.doesNotMatch(processor, /state:\s*"abandoned"/);
});
