import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828223000_shopify_webhook_subscriptions/migration.sql");
const service = read("app/lib/whatsapp/shopify-webhook-subscriptions.ts");
const oauth = read("app/lib/whatsapp/shopify-commerce.ts");
const credential = read("app/lib/whatsapp/commerce-credential-envelope.ts");
const operations = read("app/lib/whatsapp/operations-worker.ts");
const contract = read("app/lib/qa-database-contract.ts");

test("Shopify webhook subscription reconciliation is durable and tenant bound", () => {
  assert.match(schema, /model WhatsAppShopifyWebhookSync/);
  assert.match(migration, /integration_tenant_fkey/);
  assert.match(migration, /pending','processing','retry_scheduled','ready','failed/);
  assert.match(service, /FOR UPDATE SKIP LOCKED/);
  assert.match(service, /MAX_ATTEMPTS = 8/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(oauth, /whatsAppShopifyWebhookSync\.upsert/);
  assert.match(operations, /whatsapp:shopify-subscriptions/);
  assert.match(contract, /20260828223000_shopify_webhook_subscriptions/);
});

test("Shopify subscriptions use only official GraphQL topics and encrypted credentials", () => {
  assert.match(service, /CHECKOUTS_CREATE/);
  assert.match(service, /CHECKOUTS_UPDATE/);
  assert.match(service, /ORDERS_CREATE/);
  assert.match(service, /webhookSubscriptionCreate/);
  assert.match(service, /webhookSubscriptions\(first: 50/);
  assert.match(service, /x-shopify-access-token/);
  assert.match(service, /decryptCommerceCredential/);
  assert.match(credential, /createDecipheriv/);
  assert.doesNotMatch(service, /console\.(log|error)/);
  assert.doesNotMatch(service, /WhatsApp Web|QR/);
});
