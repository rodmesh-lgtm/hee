import assert from "node:assert/strict";
import test from "node:test";
import { parseContactImport } from "../app/lib/whatsapp/contact-import";

test("CSV import normalizes phones, deduplicates rows and keeps consent out of imported data", async () => {
  const parsed = await parseContactImport({
    format: "csv",
    defaultCountryCallingCode: "966",
    data: Buffer.from([
      "الاسم,رقم الجوال,البريد الإلكتروني,التصنيفات,opt_in",
      "عميل أول,0501234567,first@example.com,VIP|جدة,yes",
      "عميل مكرر,+966501234567,duplicate@example.com,VIP,yes",
      "عميل ثان,0559876543,second@example.com,متابعة,no",
    ].join("\n")),
  });

  assert.equal(parsed.totalRows, 3);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.duplicateRows, 1);
  assert.equal(parsed.rows[0].phoneE164, "+966501234567");
  assert.deepEqual(parsed.rows[0].tags, ["vip", "جدة"]);
  assert.equal("consent" in parsed.rows[0], false);
  assert.equal("optIn" in parsed.rows[0], false);
});

test("CSV parser supports quoted commas and reports invalid rows without accepting them", async () => {
  const parsed = await parseContactImport({
    format: "csv",
    data: Buffer.from('name,phone,email\n"Doe, Jane",+14155552671,jane@example.com\nBad,123,not-email'),
  });
  assert.equal(parsed.rows[0].displayName, "Doe, Jane");
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.errors, [{ rowNumber: 3, code: "invalid_phone" }]);
});

test("import fails closed when the phone header is absent", async () => {
  await assert.rejects(
    parseContactImport({ format: "csv", data: Buffer.from("name,email\nA,a@example.com") }),
    /WHATSAPP_CONTACT_IMPORT_MISSING_PHONE_HEADER/,
  );
});
