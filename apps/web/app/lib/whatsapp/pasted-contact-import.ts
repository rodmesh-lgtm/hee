import { MAX_CONTACT_IMPORT_BYTES, parseContactImport } from "./contact-import";

/** Treat pasted values as data, never as CSV headers or additional columns. */
export async function parsePastedContactImport(text: string) {
  if (!text.trim()) throw new Error("WHATSAPP_CONTACT_IMPORT_EMPTY_PASTE");
  if (Buffer.byteLength(text, "utf8") > MAX_CONTACT_IMPORT_BYTES) throw new Error("WHATSAPP_CONTACT_IMPORT_FILE_TOO_LARGE");
  const values = text.split(/[\r\n\t,;،؛]+/).map(value => value.trim()).filter(Boolean);
  if (!values.length) throw new Error("WHATSAPP_CONTACT_IMPORT_EMPTY_PASTE");
  const data = Buffer.from(["phone", ...values.map(value => `"${value.replace(/"/g, '""')}"`)].join("\n"));
  return parseContactImport({ data, format: "csv", defaultCountryCallingCode: "966" });
}
