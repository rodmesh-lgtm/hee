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

test("each accepted row is tenant-bound and does not create marketing consent", () => {
  const processor = source("app/lib/whatsapp/contact-import-processor.ts");
  assert.match(processor, /businessId_phoneE164: \{ businessId: input\.businessId/);
  assert.match(processor, /businessId: input\.businessId,\n\s+phoneE164: row\.phoneE164/);
  assert.doesNotMatch(processor, /whatsAppConsent\.(create|upsert|update)/);
  assert.match(processor, /database\.\$transaction\(async \(tx\)/);
});

test("Excel parsing uses the server-only node entry point", () => {
  const parser = source("app/lib/whatsapp/contact-import.ts");
  assert.match(parser, /read-excel-file\/node/);
  assert.match(parser, /input\.format === "csv"/);
});
