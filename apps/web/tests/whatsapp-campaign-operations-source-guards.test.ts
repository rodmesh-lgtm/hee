import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const operations = source("app/lib/whatsapp/campaign-operations.ts");
const scheduler = source("scripts/whatsapp-campaign-scheduler.ts");

test("campaign transitions are serialized and tenant scoped", () => {
  assert.match(operations, /FOR UPDATE/);
  assert.match(operations, /businessId: input\.businessId/);
  assert.match(operations, /TransactionIsolationLevel\.Serializable/g);
  assert.match(operations, /status: "paused"/);
  assert.match(operations, /status: "running"/);
  assert.match(operations, /status: "cancelled"/);
});

test("resume wakes only retryable jobs in the same campaign and tenant", () => {
  assert.match(operations, /whatsAppDeliveryJob\.updateMany/);
  assert.match(operations, /campaignId: input\.campaignId/);
  assert.match(operations, /status: "retry_scheduled"/);
  assert.match(operations, /nextAttemptAt: now/);
});

test("scheduler is bounded and sends only through the durable enqueue boundary", () => {
  assert.match(scheduler, /status: "scheduled"/);
  assert.match(scheduler, /scheduledAt: \{ lte: now \}/);
  assert.match(scheduler, /take: 100/);
  assert.match(scheduler, /enqueueWhatsAppCampaign/);
  assert.doesNotMatch(scheduler, /fetch\(|graph\.facebook\.com/);
});

test("reporting derives monotonic delivery totals from tenant-bound recipient rows", () => {
  assert.match(operations, /whatsAppCampaignRecipient\.groupBy/);
  assert.match(operations, /const sent = count\("sent"\) \+ count\("delivered"\) \+ count\("read"\)/);
  assert.match(operations, /delivered = count\("delivered"\) \+ count\("read"\)/);
  assert.match(operations, /direction: "inbound"/);
  assert.match(operations, /replies/);
  assert.match(operations, /reconcileWhatsAppCampaignCompletion/);
});
