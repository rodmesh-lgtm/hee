import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("prisma/migrations/20260827201500_whatsapp_delivery_queue/migration.sql");
const queue = source("app/lib/whatsapp/delivery-queue.ts");
const worker = source("app/lib/whatsapp/delivery-worker.ts");
const webhookProcessor = source("app/lib/whatsapp/webhook-processor.ts");

test("delivery rows are bound to the exact tenant, campaign, connection and recipient", () => {
  assert.match(migration, /FOREIGN KEY \("campaignId", "businessId", "connectionId"\)/);
  assert.match(migration, /FOREIGN KEY \("recipientId", "businessId", "campaignId"\)/);
  assert.match(migration, /WhatsAppDeliveryJob_idempotency_unique/);
  assert.match(migration, /WhatsAppDeliveryJob_provider_message_unique/);
  assert.match(migration, /WhatsAppDeliveryJob_lease_check/);
});

test("delivery receipts advance both the message and campaign recipient", () => {
  assert.match(webhookProcessor, /providerMessageId: receipt\.providerMessageId/);
  assert.match(webhookProcessor, /whatsAppCampaignRecipient\.update/);
  assert.match(webhookProcessor, /nextWhatsAppMessageStatus\(delivery\.recipient\.status/);
});

test("enqueue is serialized and rechecks consent and opt-out", () => {
  assert.match(queue, /FOR UPDATE/);
  assert.match(queue, /TransactionIsolationLevel\.Serializable/);
  assert.match(queue, /optedOutAt: null/);
  assert.match(queue, /revokedAt: null/);
  assert.match(queue, /skipped_opt_out/);
  assert.match(queue, /skipDuplicates: true/);
});

test("worker claims safely, rate limits atomically and never retries ambiguous sends", () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /ON CONFLICT \("connectionId", "windowStart"\) DO UPDATE/);
  assert.match(worker, /assertOutboundEnabled/);
  assert.match(worker, /META_NETWORK_OUTCOME_UNKNOWN/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /"delivery_unknown"/);
  assert.match(worker, /optedOutAt/);
  assert.match(worker, /revokedAt: null/);
});

test("worker uses only the official Meta Graph endpoint and does not log credentials", () => {
  assert.match(worker, /metaWhatsAppGraphUrl/);
  assert.match(worker, /authorization: `Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(worker, /console\.(log|error)/);
  assert.doesNotMatch(worker, /whatsapp-web|qr code|puppeteer/i);
});
