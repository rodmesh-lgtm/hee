import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828200000_whatsapp_shopify_webhook_inbox/migration.sql");
const route = read("app/api/whatsapp/commerce/shopify/webhook/route.ts");
const domain = read("app/lib/whatsapp/shopify-domain.ts");
const contract = read("app/lib/qa-database-contract.ts");

test("Shopify webhook inbox is durable, idempotent and tenant constrained", () => {
  assert.match(schema, /model WhatsAppShopifyWebhookEvent \{/);
  assert.match(schema, /integration WhatsAppCommerceIntegration @relation\(fields: \[integrationId, businessId\], references: \[id, businessId\]/);
  assert.match(migration, /integration_tenant_fkey/);
  assert.match(migration, /webhookId_key/);
  assert.match(contract, /20260828200000_whatsapp_shopify_webhook_inbox/);
  assert.match(route, /where: \{ webhookId \}, update: \{\}/);
});

test("ingress verifies raw body before parsing and derives tenant only from active store mapping", () => {
  assert.ok(route.indexOf("verifyShopifyWebhookHmac(rawBody") < route.indexOf("JSON.parse(rawBody)"));
  assert.match(route, /readBoundedText\(request, MAX_BYTES\)/);
  assert.match(route, /x-shopify-webhook-id/);
  assert.match(route, /x-shopify-shop-domain/);
  assert.match(route, /provider: "shopify", externalStoreId: shop, status: "active"/);
  assert.match(domain, /digest\(\)/);
  assert.match(domain, /timingSafeEqual/);
  assert.doesNotMatch(route, /console\.(log|error)/);
});
