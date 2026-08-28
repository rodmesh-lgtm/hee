import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828191500_whatsapp_shopify_oauth_activation/migration.sql");
const service = read("app/lib/whatsapp/shopify-commerce.ts");
const registry = read("app/lib/whatsapp/commerce-integrations.ts");
const domain = read("app/lib/whatsapp/shopify-domain.ts");
const config = read("app/lib/whatsapp/shopify-config.ts");
const callback = read("app/api/whatsapp/commerce/shopify/callback/route.ts");
const actions = read("app/actions/whatsapp-marketing.ts");
const page = read("app/dashboard/whatsapp/integrations/page.tsx");
const contract = read("app/lib/qa-database-contract.ts");

test("Shopify OAuth sessions are one-time, finite, and tenant-bound in PostgreSQL", () => {
  assert.match(schema, /model WhatsAppCommerceOAuthSession \{/);
  assert.match(schema, /integration\s+WhatsAppCommerceIntegration\s+@relation\(fields: \[integrationId, businessId\], references: \[id, businessId\]/);
  assert.match(migration, /status" IN \('created','exchanging','connected','failed','cancelled'\)/);
  assert.match(migration, /FOREIGN KEY \("integrationId","businessId"\)/);
  assert.match(migration, /"stateDigest"\) = 64/);
  assert.match(contract, /20260828191500_whatsapp_shopify_oauth_activation/);
});

test("activation requires RBAC, entitlement, callback HMAC, state, shop ownership and scopes", () => {
  assert.match(actions, /getWhatsAppWriteContext\("connection\.manage"\)/);
  assert.match(actions, /createShopifyAuthorization/);
  assert.match(callback, /verifyShopifyOAuthHmac/);
  assert.match(callback, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(callback, /Math\.abs\(Date\.now\(\) - timestamp \* 1000\)/);
  assert.match(service, /stateDigest\(input\.state\)/);
  assert.match(service, /initiatedByUserId" = \$\{input\.userId\}/);
  assert.match(service, /externalStoreId: shop/);
  assert.match(service, /myshopifyDomain/);
  assert.match(service, /SHOPIFY_SCOPES_MISSING/);
  assert.match(config, /"read_orders", "read_customers"/);
});

test("credentials stay encrypted and activation is globally exclusive", () => {
  assert.match(service, /encryptCommerceCredential/);
  assert.match(service, /status: "active", credentialEnvelope/);
  assert.match(service, /provider: "shopify", externalStoreId: verified\.domain, status: "active"/);
  assert.match(service, /SHOPIFY_SHOP_ALREADY_ASSIGNED/);
  assert.match(registry, /whatsAppCommerceOAuthSession\.updateMany/);
  assert.match(registry, /status: "cancelled", consumedAt: now, lastErrorCode: "integration_disconnected"/);
  assert.match(domain, /timingSafeEqual/);
  assert.match(page, /ربط Shopify رسميًا/);
  assert.doesNotMatch(page, /accessToken/);
  assert.doesNotMatch(service, /console\.(log|error)/);
});

test("OAuth configuration is lazy and callback uses the configured Admin GraphQL version", () => {
  assert.match(config, /SHOPIFY_ADMIN_API_VERSION/);
  assert.match(config, /WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY/);
  assert.match(service, /graphql\.json/);
  assert.match(service, /SHOPIFY_ADMIN_API_VERSION/);
  assert.match(service, /shopifyOAuthCallbackUrl\(\)/);
});
