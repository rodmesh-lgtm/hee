import assert from "node:assert/strict";
import test from "node:test";
import { parseContactImport } from "../app/lib/whatsapp/contact-import";

test("25,000 contacts are parsed without the former row limit or truncation", async () => {
  const rows = Array.from({ length: 25_000 }, (_, index) => `+9665${String(index).padStart(8, "0")},عميل ${index},batch`);
  const parsed = await parseContactImport({ data: Buffer.from(["phone,name,tags", ...rows].join("\n")), format: "csv" });
  assert.equal(parsed.totalRows, 25_000);
  assert.equal(parsed.rows.length, 25_000);
  assert.equal(parsed.errors.length, 0);
  assert.match(parsed.rows[0].phoneE164, /^\+9665/);
});

test("optional trailing email and tags columns may be absent on short rows", async () => {
  const parsed = await parseContactImport({ data: Buffer.from("phone,email,tags\n+966500000001"), format: "csv" });
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].email, null);
  assert.deepEqual(parsed.rows[0].tags, []);
});
