import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828183000_whatsapp_commerce_integration_registry/migration.sql");
const registry = read("app/lib/whatsapp/commerce-integrations.ts");
const actions = read("app/actions/whatsapp-marketing.ts");
const page = read("app/dashboard/whatsapp/integrations/page.tsx");
const center = read("app/dashboard/whatsapp/page.tsx");
const contract = read("app/lib/qa-database-contract.ts");

test("commerce integration registry is tenant scoped and finite", () => {
  assert.match(schema, /model WhatsAppCommerceIntegration \{/);
  assert.match(schema, /@@unique\(\[businessId, provider, externalStoreId\]/);
  assert.match(schema, /@@unique\(\[id, businessId\]/);
  assert.match(migration, /provider" IN \('salla','zid','shopify'\)/);
  assert.match(migration, /status" IN \('draft','active','disconnected'\)/);
  assert.match(migration, /FOREIGN KEY \("businessId"\)/);
  assert.match(contract, /20260828183000_whatsapp_commerce_integration_registry/);
});

test("unverified drafts cannot reserve a provider store globally", () => {
  assert.match(migration, /active_store_unique/);
  assert.match(migration, /WHERE "status" = 'active'/);
  assert.match(migration, /status" = 'draft' AND "credentialEnvelope" IS NULL/);
  assert.match(migration, /status" = 'active' AND "credentialEnvelope" IS NOT NULL/);
  assert.match(migration, /status" = 'disconnected' AND "credentialEnvelope" IS NULL/);
  assert.match(registry, /status: \{ in: \["draft", "active"\] \}/);
  assert.match(registry, /credentialEnvelope: Prisma\.DbNull/);
});

test("provider store identifiers are normalized with provider-specific contracts", () => {
  assert.match(registry, /provider === "salla"[\s\S]*\^\\d\{1,32\}\$/);
  assert.match(registry, /provider === "zid"[\s\S]*\[0-9a-f\]\{8\}/);
  assert.match(registry, /provider === "shopify"[\s\S]*\\\.myshopify\\\.com\$/);
  assert.match(registry, /value\.trim\(\)\.toLowerCase\(\)/);
});

test("registration and disconnect are entitlement, RBAC, audit and tenant guarded", () => {
  assert.match(actions, /getWhatsAppWriteContext\("connection\.manage"\)/);
  assert.match(actions, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(actions, /registerWhatsAppCommerceIntegration/);
  assert.match(actions, /disconnectWhatsAppCommerceIntegration/);
  assert.match(registry, /businessId_provider_externalStoreId/);
  assert.match(registry, /WHERE "id" = \$\{input\.integrationId\} AND "businessId" = \$\{input\.businessId\}/);
  assert.match(registry, /FOR UPDATE/);
  assert.match(registry, /commerce\.integration\.register/);
  assert.match(registry, /commerce\.integration\.disconnect/);
});

test("dashboard is discoverable but does not expose or claim active credentials", () => {
  assert.match(center, /\/dashboard\/whatsapp\/integrations/);
  assert.match(page, /getWhatsAppReadContext\("connection\.manage"\)/);
  assert.match(page, /تم حفظ بيانات المتجر كبداية للربط/);
  assert.match(page, /سلة وزد يبقيان في مرحلة الإعداد/);
  assert.match(page, /لا تضع كلمات مرور أو مفاتيح سرية في هذه الصفحة/);
  assert.match(page, /Shopify متاح للربط الرسمي الآن/);
  assert.doesNotMatch(page, /select: \{[^}]*credentialEnvelope/);
  assert.doesNotMatch(page, /decryptWhatsAppCredential/);
});
