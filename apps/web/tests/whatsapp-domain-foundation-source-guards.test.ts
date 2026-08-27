import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

test("WhatsApp marketing eligibility requires explicit tenant-bound consent", () => {
  const source = read("app/lib/whatsapp/domain.ts");
  assert.match(source, /consent\.revokedAt/);
  assert.match(source, /consent\.businessId === input\.businessId/);
  assert.match(source, /consent\.phoneE164 === input\.phoneE164/);
  assert.doesNotMatch(source, /orderId|bookingId/);
});

test("WhatsApp tenant records fail closed across businesses", () => {
  const source = read("app/lib/whatsapp/domain.ts");
  assert.match(source, /WHATSAPP_TENANT_SCOPE_VIOLATION/);
  assert.match(source, /record\.businessId !== activeBusinessId/);
});

test("WhatsApp credentials use authenticated versioned encryption bound to business context", () => {
  const source = read("app/lib/whatsapp/credential-envelope.ts");
  assert.match(source, /aes-256-gcm/);
  assert.match(source, /keyVersion/);
  assert.match(source, /setAAD/);
  assert.match(source, /input\.businessId/);
  assert.match(source, /getAuthTag/);
  assert.doesNotMatch(source, /META_WHATSAPP_SYSTEM_USER_TOKEN/);
});
