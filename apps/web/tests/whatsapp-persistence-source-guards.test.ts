import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("WhatsApp persistence remains tenant scoped and credentials are envelope-only", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /model WhatsAppConnection[\s\S]*businessId String/);
  assert.match(schema, /credentialEnvelope Json/);
  assert.doesNotMatch(schema, /accessToken String|systemUserToken String/);
  assert.match(schema, /@@unique\(\[provider, phoneNumberId\]/);
  assert.match(schema, /marketingEnabled Boolean @default\(true\)/);
  assert.match(schema, /bookingEnabled Boolean @default\(false\)/);
  const purposeMigration = source("prisma/migrations/20260919143000_split_whatsapp_booking_and_marketing_numbers/migration.sql");
  assert.match(purposeMigration, /WhatsAppConnection_one_marketing_number_per_business/);
  assert.match(purposeMigration, /WhatsAppConnection_one_booking_number_per_business/);
});

test("marketing consent is explicit, revocable and unique per tenant destination", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /model WhatsAppConsent[\s\S]*phoneE164 String/);
  assert.match(schema, /consentedAt DateTime/);
  assert.match(schema, /revokedAt DateTime\?/);
  assert.match(schema, /@@unique\(\[businessId, phoneE164\]/);
});

test("webhook inbox has provider deduplication before later processing", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260827143000_whatsapp_persistence/migration.sql");
  assert.match(schema, /model WhatsAppWebhookEvent/);
  assert.match(schema, /@@unique\(\[provider, providerEventId\]/);
  assert.match(migration, /WhatsAppWebhookEvent_provider_event_unique/);
  assert.match(migration, /ON DELETE SET NULL/);
});
