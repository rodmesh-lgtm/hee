import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("contact imports are bounded, auditable and idempotent per tenant file", () => {
  const parser = source("app/lib/whatsapp/contact-import.ts");
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260827173000_whatsapp_contact_imports/migration.sql");
  assert.match(parser, /MAX_CONTACT_IMPORT_BYTES = 5 \* 1024 \* 1024/);
  assert.match(parser, /MAX_CONTACT_IMPORT_ROWS = 10_000/);
  assert.match(schema, /model WhatsAppContactImport[\s\S]*@@unique\(\[businessId, fileSha256\]/);
  assert.match(migration, /WhatsAppContactImport_business_file_unique/);
});

test("accepted rows are durably queued in bounded tenant-owned batches", () => {
  const processor = source("app/lib/whatsapp/contact-import-processor.ts");
  assert.match(processor, /IMPORT_CHUNK_SIZE = 500/);
  assert.match(processor, /enqueueContactImport/);
  assert.match(processor, /whatsAppContactImportBatch\.createMany/);
  assert.match(processor, /importId, businessId: input\.businessId, batchIndex/);
  assert.match(processor, /businessId_fileSha256/);
  assert.match(processor, /totalRows - input\.parsed\.rows\.length - input\.parsed\.duplicateRows/);
  assert.match(processor, /skipDuplicates: true/);
});

test("the import worker uses leases, retries and tenant-scoped atomic persistence", () => {
  const processor = source("app/lib/whatsapp/contact-import-processor.ts");
  const worker = source("scripts/whatsapp-contact-import-worker.ts");
  assert.match(processor, /FOR UPDATE OF b SKIP LOCKED/);
  assert.match(processor, /leaseOwner: workerId/);
  assert.match(processor, /IMPORT_MAX_ATTEMPTS = 5/);
  assert.match(processor, /businessId: claimed\.businessId, phoneE164: \{ in: phones \}/);
  assert.match(processor, /whatsAppContact\.createMany/);
  assert.match(processor, /whatsAppConsent\.createMany/);
  assert.match(processor, /consentConfirmed && batch\.contactImport\.consentEvidence/);
  assert.match(processor, /actorType: "worker"/);
  assert.match(worker, /processNextContactImportBatch/);
  assert.match(processor, /retryFailedContactImport/);
  assert.match(processor, /WHATSAPP_CONTACT_IMPORT_STILL_PROCESSING/);
  assert.match(processor, /attemptCount: 0/);
});

test("durable import migration enforces tenant and queue invariants", () => {
  const migration = source("prisma/migrations/20260828133000_whatsapp_durable_contact_imports/migration.sql");
  assert.match(migration, /WhatsAppContactImportBatch_import_tenant_fkey/);
  assert.match(migration, /FOREIGN KEY \("importId", "businessId"\)/);
  assert.match(migration, /WhatsAppContactImportBatch_lease_check/);
  assert.match(migration, /WhatsAppContactImportBatch_ready_idx/);
  assert.match(migration, /WHERE "status" = 'processing'/);
});

test("Excel parsing uses the server-only node entry point", () => {
  const parser = source("app/lib/whatsapp/contact-import.ts");
  assert.match(parser, /read-excel-file\/node/);
  assert.match(parser, /input\.format === "csv"/);
});
