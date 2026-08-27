import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Prisma client owns WhatsApp conversation and message models directly", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /whatsappConversations WhatsAppConversation\[\]/);
  assert.match(schema, /whatsappMessages WhatsAppMessage\[\]/);
  assert.match(schema, /model WhatsAppConversation \{/);
  assert.match(schema, /model WhatsAppMessage \{/);
  assert.match(schema, /conversation WhatsAppConversation @relation\(fields: \[conversationId, businessId\], references: \[id, businessId\]/);
});

test("webhook worker serializes claims safely across concurrent workers", () => {
  const processor = source("app/lib/whatsapp/webhook-processor.ts");
  assert.match(processor, /FOR UPDATE SKIP LOCKED/);
  assert.match(processor, /WHERE "processedAt" IS NULL/);
  assert.match(processor, /ORDER BY "receivedAt" ASC, "id" ASC/);
});

test("status updates and duplicate inbound provider ids remain tenant bound", () => {
  const processor = source("app/lib/whatsapp/webhook-processor.ts");
  assert.match(processor, /message\.businessId !== event\.businessId/);
  assert.match(processor, /WHATSAPP_STATUS_TENANT_MISMATCH/);
  assert.match(processor, /existing\.businessId !== event\.businessId \|\| existing\.conversationId !== conversation\.id/);
  assert.match(processor, /WHATSAPP_MESSAGE_ID_TENANT_COLLISION/);
});

test("partial webhook mutations roll back before an error is persisted", () => {
  const processor = source("app/lib/whatsapp/webhook-processor.ts");
  const transactionAt = processor.indexOf("return await database.$transaction");
  const catchAt = processor.indexOf("} catch (error)", transactionAt);
  const errorWriteAt = processor.indexOf("database.whatsAppWebhookEvent.updateMany", catchAt);
  assert.ok(transactionAt >= 0 && catchAt > transactionAt && errorWriteAt > catchAt);
  assert.doesNotMatch(processor.slice(transactionAt, catchAt), /processingError:/);
});

test("webhook worker is bounded and stops on a poison event", () => {
  const worker = source("scripts/whatsapp-webhook-worker.ts");
  assert.match(worker, /Math\.min\(requestedBatch, 500\)/);
  assert.match(worker, /for \(let index = 0; index < batchSize; index \+= 1\)/);
  assert.match(worker, /failed \+= 1/);
  assert.match(worker, /break;/);
  assert.match(worker, /process\.exitCode = 1/);
});
