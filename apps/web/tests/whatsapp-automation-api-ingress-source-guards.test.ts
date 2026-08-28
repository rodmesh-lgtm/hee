import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828163000_whatsapp_automation_api_keys/migration.sql");
const keys = read("app/lib/whatsapp/automation-api-keys.ts");
const route = read("app/api/whatsapp/automations/events/route.ts");
const actions = read("app/actions/whatsapp-marketing.ts");
const page = read("app/dashboard/whatsapp/automations/page.tsx");
const contract = read("app/lib/qa-database-contract.ts");

test("automation API keys are tenant scoped, hashed and constrained", () => {
  assert.match(schema, /model WhatsAppAutomationApiKey/);
  assert.match(migration, /WhatsAppAutomationApiKey_hash_check/);
  assert.match(migration, /FOREIGN KEY \("businessId"\)/);
  assert.match(keys, /createHash\("sha256"\)/);
  assert.match(keys, /randomBytes\(32\)/);
  assert.doesNotMatch(schema, /plaintext|secret/);
  assert.match(contract, /20260828163000_whatsapp_automation_api_keys/);
});

test("key lifecycle is protected by entitlement, automation RBAC and audit", () => {
  assert.match(actions, /automationContext\(\)/g);
  assert.match(actions, /createWhatsAppAutomationApiKey/);
  assert.match(actions, /revokeWhatsAppAutomationApiKey/);
  assert.match(keys, /automation\.api_key\.create/);
  assert.match(keys, /automation\.api_key\.revoke/);
  assert.match(keys, /FOR UPDATE/);
  assert.match(page, /AutomationApiKeyManager/);
});

test("public ingress authenticates before tenant derivation and fails closed", () => {
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /where: \{ keyPrefix: prefix \}/);
  assert.match(route, /key\.businessId/);
  assert.match(route, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(route, /consumePublicWriteLimit/g);
  assert.match(route, /scope: "whatsapp-automation-api-auth"/);
  assert.match(route, /readBoundedJson\(request, 16 \* 1024\)/);
  assert.match(route, /businessId: key\.businessId, optedOutAt: null/);
  assert.match(route, /!consent \|\| consent\.revokedAt/);
  assert.match(route, /source: "tenant\.api"/);
  assert.match(route, /FOR SHARE/);
});

test("ingress is idempotent durable-only and event names are exact", () => {
  assert.match(route, /ingestWhatsAppAutomationEvent/);
  assert.match(route, /automationMatchesEvent/);
  assert.match(route, /status: 202/);
  assert.match(route, /idempotency_conflict/);
  assert.doesNotMatch(route, /fetch\(/);
  assert.doesNotMatch(route, /graph\.facebook\.com/);
});
