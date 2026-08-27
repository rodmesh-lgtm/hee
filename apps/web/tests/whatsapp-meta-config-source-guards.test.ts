import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configPath = new URL("../app/lib/whatsapp/meta-config.ts", import.meta.url);
const readinessPath = new URL("../../../docs/whatsapp/phase-0-meta-readiness.md", import.meta.url);

test("WhatsApp Meta configuration remains server-only and fail-closed", async () => {
  const source = await readFile(configPath, "utf8");
  assert.match(source, /import "server-only"/);
  assert.match(source, /META_WHATSAPP_SYSTEM_USER_TOKEN/);
  assert.match(source, /META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY/);
  assert.match(source, /META_WHATSAPP_BILLING_MODE/);
  assert.match(source, /META_WHATSAPP_CONFIG_INVALID/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_META/);
  assert.doesNotMatch(source, /console\.(?:log|error|warn)\s*\(/);
});

test("Phase 0 contract forbids unofficial WhatsApp transport and Production migration", async () => {
  const source = await readFile(readinessPath, "utf8");
  assert.match(source, /official WhatsApp Business Platform \/ Cloud API/);
  assert.match(source, /No WhatsApp Web, QR-session automation, unofficial clients/);
  assert.match(source, /Phase 0 performs no Production database migration/);
  assert.match(source, /Business\.id.*tenant boundary/);
  assert.match(source, /customer_meta/);
  assert.match(source, /ir_pass_through/);
});
