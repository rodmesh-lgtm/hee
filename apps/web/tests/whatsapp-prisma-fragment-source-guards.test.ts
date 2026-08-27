import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const fragment = readFileSync(resolve(process.cwd(), "prisma/whatsapp-messages.prisma.fragment"), "utf8");

test("staged WhatsApp models encode composite tenant ownership", () => {
  assert.match(fragment, /model WhatsAppConversation/);
  assert.match(fragment, /model WhatsAppMessage/);
  assert.match(fragment, /@@unique\(\[id, businessId\]/);
  assert.match(fragment, /@relation\(fields: \[conversationId, businessId\], references: \[id, businessId\], onDelete: Restrict\)/);
});

test("staged message model keeps provider idempotency", () => {
  assert.match(fragment, /@@unique\(\[provider, providerMessageId\]/);
});
