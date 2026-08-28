import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260828103000_whatsapp_automation_foundation/migration.sql",
  "utf8",
);
const processor = readFileSync("app/lib/whatsapp/automation-processor.ts", "utf8");
const contract = readFileSync("app/lib/qa-database-contract.ts", "utf8");

test("automation persistence and migration remain integrated", () => {
  for (const model of ["WhatsAppAutomation", "WhatsAppAutomationEvent", "WhatsAppAutomationRun", "WhatsAppAutomationJob"]) {
    assert.ok(schema.includes(`model ${model} {`), `${model} is missing from Prisma`);
    assert.ok(migration.includes(`CREATE TABLE "${model}"`), `${model} is missing from migration`);
  }
  assert.ok(contract.includes("20260828103000_whatsapp_automation_foundation"));
});

test("database constraints enforce tenant-safe automation associations", () => {
  assert.ok(migration.includes('FOREIGN KEY ("connectionId","businessId")'));
  assert.ok(migration.includes('FOREIGN KEY ("contactId","businessId")'));
  assert.ok(migration.includes('FOREIGN KEY ("templateId","businessId","connectionId")'));
  assert.ok(migration.includes('FOREIGN KEY ("runId","businessId","automationId")'));
  assert.ok(migration.includes('UNIQUE INDEX "WhatsAppAutomationEvent_tenant_source_event_unique"'));
});

test("processor is transactional, replay-safe and queues without calling Meta", () => {
  assert.ok(processor.includes("TransactionIsolationLevel.Serializable"));
  assert.ok(processor.includes("FOR UPDATE"));
  assert.ok(processor.includes("FOR UPDATE SKIP LOCKED"));
  assert.ok(processor.includes("whatsAppAutomationEvent.upsert"));
  assert.ok(processor.includes("whatsAppAutomationJob.upsert"));
  assert.ok(processor.includes("businessId: event.businessId"));
  assert.ok(processor.includes("optedOutAt"));
  assert.ok(processor.includes("revokedAt"));
  assert.ok(processor.includes('status: "approved"'));
  assert.equal(processor.includes("fetch("), false, "event processor must not send inside processing transaction");
  assert.equal(processor.includes("graph.facebook.com"), false, "event processor must only enqueue durable jobs");
});
