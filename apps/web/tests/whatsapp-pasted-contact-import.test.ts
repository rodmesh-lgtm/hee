import assert from "node:assert/strict";
import test from "node:test";
import { parsePastedContactImport } from "../app/lib/whatsapp/pasted-contact-import";
import { parseContactImport } from "../app/lib/whatsapp/contact-import";

test("pasted Saudi country prefixes normalize once and deduplicate equivalent forms", async () => {
  const result = await parsePastedContactImport("966501234567\n+966501234567,00966501234567؛0501234567\t٩٦٦٥٥١٢٣٤٥٦٧");
  assert.deepEqual(result.rows.map(row => row.phoneE164), ["+966501234567", "+966551234567"]);
  assert.equal(result.duplicateRows, 3);
  assert.equal(result.totalRows, 5);
  assert.equal("consent" in result.rows[0], false);
});

test("pasted invalid values cannot inject CSV columns or consent", async () => {
  const result = await parsePastedContactImport('966501234567\n"phone"\n=1+1\nconsent:true');
  assert.equal(result.rows.length, 1);
  assert.equal(result.errors.length, 3);
  await assert.rejects(parsePastedContactImport(" , ؛\n"), /EMPTY_PASTE/);
});

test("paste import accepts 25000 contacts without a campaign recipient cap", async () => {
  const result = await parsePastedContactImport(Array.from({length: 25_000}, (_, i) => `9665${String(i).padStart(8, "0")}`).join("\n"));
  assert.equal(result.rows.length, 25_000);
  assert.equal(result.errors.length, 0);
});

test("file import also accepts bare 966 without doubling the country prefix", async () => {
  const result = await parseContactImport({ data: Buffer.from("phone\n966501234567\n+966501234567"), format: "csv", defaultCountryCallingCode: "966" });
  assert.equal(result.rows[0].phoneE164, "+966501234567");
  assert.equal(result.duplicateRows, 1);
});
