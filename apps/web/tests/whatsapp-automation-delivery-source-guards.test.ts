import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync("app/lib/whatsapp/automation-delivery-worker.ts", "utf8");
const script = readFileSync("scripts/whatsapp-automation-delivery-worker.ts", "utf8");
const operations = readFileSync("app/lib/whatsapp/operations-worker.ts", "utf8");

test("automation deliveries are reachable from the durable operations cycle", () => {
  assert.match(operations, /"whatsapp:automations"[\s\S]*"whatsapp:automation-deliveries"/);
  assert.match(script, /processNextWhatsAppAutomationDelivery/);
  assert.match(script, /WHATSAPP_AUTOMATION_DELIVERY_BATCH_SIZE/);
  assert.match(script, /await db\.\$disconnect\(\)/);
});

test("automation delivery claims are leased, replay-safe and ambiguous outcomes are terminal", () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED LIMIT 1/);
  assert.match(worker, /status: "processing"/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /status: "delivery_unknown"/);
  assert.match(worker, /META_NETWORK_OUTCOME_UNKNOWN/);
  assert.match(worker, /META_SUCCESS_RESPONSE_INVALID/);
  assert.doesNotMatch(worker, /delivery_unknown[\s\S]{0,300}retry_scheduled/);
});

test("automation delivery rechecks every outbound authorization boundary", () => {
  const gate = worker.indexOf("assertOutboundEnabled(env)");
  const claim = worker.indexOf("await claimNext(");
  assert.ok(gate > 0 && claim > gate, "outbound gate must run before claiming a durable job");
  assert.match(worker, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(worker, /businessId: job\.businessId, automationId: job\.automationId, runId: job\.runId, connectionId: job\.connectionId/);
  assert.match(worker, /context\.automation\.status !== "active"/);
  assert.match(worker, /context\.connection\.provider !== "meta"/);
  assert.match(worker, /context\.template\.status !== "approved"/);
  assert.match(worker, /context\.contact\.optedOutAt \|\| !consent/);
  assert.match(worker, /consentedAt: \{ lte: now \}/);
});

test("automation delivery shares tenant rate limits and uses only Meta Cloud API", () => {
  assert.match(worker, /INSERT INTO "WhatsAppSendRateBucket"/);
  assert.match(worker, /"businessId" = \$\{job\.businessId\}/);
  assert.match(worker, /outboundRateLimit\(env\)/);
  assert.match(worker, /metaWhatsAppGraphUrl\(config, `\$\{context\.connection\.phoneNumberId\}\/messages`\)/);
  assert.match(worker, /authorization: `Bearer \$\{accessToken\}`/);
  assert.match(worker, /AbortSignal\.timeout\(15_000\)/);
  assert.doesNotMatch(worker, /web\.whatsapp|qr|baileys|whatsapp-web/i);
  assert.doesNotMatch(worker, /console\.(log|error)/);
});

test("successful automation send atomically records message, job, run and audit evidence", () => {
  assert.match(worker, /database\.\$transaction\(async \(tx\)/);
  assert.match(worker, /tx\.whatsAppConversation\.upsert/);
  assert.match(worker, /tx\.whatsAppMessage\.upsert/);
  assert.match(worker, /tx\.whatsAppAutomationJob\.update/);
  assert.match(worker, /tx\.whatsAppAutomationRun\.update/);
  assert.match(worker, /automation\.delivery\.send/);
  assert.match(worker, /status: "completed", completedAt: now/);
});
