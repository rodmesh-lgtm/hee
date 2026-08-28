import assert from "node:assert/strict";
import test from "node:test";
import { MAX_CONTACT_IMPORT_ROWS, parseContactImport } from "../app/lib/whatsapp/contact-import";

test("a maximum-size CSV contact list is parsed and normalized without truncation", async () => {
  const rows = Array.from({ length: MAX_CONTACT_IMPORT_ROWS }, (_, index) => `+9665${String(index).padStart(8, "0")},عميل ${index},batch`);
  const parsed = await parseContactImport({ data: Buffer.from(["phone,name,tags", ...rows].join("\n")), format: "csv" });
  assert.equal(parsed.totalRows, MAX_CONTACT_IMPORT_ROWS);
  assert.equal(parsed.rows.length, MAX_CONTACT_IMPORT_ROWS);
  assert.equal(parsed.errors.length, 0);
  assert.match(parsed.rows[0].phoneE164, /^\+9665/);
});
