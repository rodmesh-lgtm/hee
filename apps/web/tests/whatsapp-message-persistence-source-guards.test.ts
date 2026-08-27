import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260827153000_whatsapp_messages/migration.sql"), "utf8");

test("WhatsApp conversations are tenant-owned and destination scoped", () => {
  assert.match(migration, /WhatsAppConversation_tenant_phone_unique/);
  assert.match(migration, /FOREIGN KEY \("businessId"\) REFERENCES "Business"\("id"\) ON DELETE RESTRICT/);
});

test("provider message IDs are globally idempotent per provider", () => {
  assert.match(migration, /WhatsAppMessage_provider_message_unique/);
  assert.match(migration, /\("provider", "providerMessageId"\)/);
});

test("database prevents cross-tenant conversation/message association", () => {
  assert.match(migration, /WhatsAppConversation_id_business_unique/);
  assert.match(migration, /FOREIGN KEY \("conversationId", "businessId"\) REFERENCES "WhatsAppConversation"\("id", "businessId"\)/);
});

test("message direction and lifecycle state are finite at the database boundary", () => {
  assert.match(migration, /"direction" IN \('inbound', 'outbound'\)/);
  assert.match(migration, /"status" IN \('received', 'queued', 'sent', 'delivered', 'read', 'failed'\)/);
});
