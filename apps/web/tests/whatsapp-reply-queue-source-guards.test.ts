import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("prisma/migrations/20260828034500_whatsapp_reply_queue/migration.sql");
const queue = source("app/lib/whatsapp/reply-queue.ts");
const worker = source("app/lib/whatsapp/reply-worker.ts");
const action = source("app/actions/whatsapp.ts");

test("reply jobs bind connection and conversation to the exact tenant phone", () => {
  assert.match(migration, /FOREIGN KEY \("connectionId", "businessId", "phoneNumberId"\)/);
  assert.match(migration, /FOREIGN KEY \("conversationId", "businessId", "phoneNumberId"\)/);
  assert.match(migration, /WhatsAppReplyJob_idempotency_unique/);
  assert.match(migration, /char_length\("textBody"\) BETWEEN 1 AND 4096/);
});

test("enqueue is serialized, idempotent and rechecks the service window", () => {
  assert.match(queue, /FOR UPDATE/);
  assert.match(queue, /TransactionIsolationLevel\.Serializable/);
  assert.match(queue, /whatsAppCustomerServiceWindow/);
  assert.match(queue, /businessId: input\.businessId/g);
  assert.match(queue, /pending >= 20/);
});

test("server action authenticates ownership and only enqueues", () => {
  assert.match(action, /getWhatsAppWriteContext\("reply"\)/);
  assert.match(action, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(action, /enqueueWhatsAppReply/);
  assert.doesNotMatch(action, /fetch\(|graph\.facebook\.com/);
});

test("reply worker fails closed and never retries an ambiguous outcome", () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /META_NETWORK_OUTCOME_UNKNOWN/);
  assert.match(worker, /delivery_unknown/);
  assert.match(worker, /whatsAppCustomerServiceWindow/);
  assert.match(worker, /assertOutboundEnabled/);
  assert.doesNotMatch(worker, /console\.(log|error)/);
});
