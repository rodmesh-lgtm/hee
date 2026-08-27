import { createHash } from "node:crypto";
import { readSheet } from "read-excel-file/node";
import { normalizeContactLabel, normalizeE164 } from "./contact-domain";

export const MAX_CONTACT_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_CONTACT_IMPORT_ROWS = 10_000;
const MAX_COLUMNS = 20;
const MAX_CELL_LENGTH = 512;

export type ContactImportFormat = "csv" | "xlsx";
export type ContactImportErrorCode =
  | "empty_file"
  | "file_too_large"
  | "too_many_rows"
  | "too_many_columns"
  | "missing_phone_header"
  | "invalid_phone"
  | "invalid_email"
  | "cell_too_long"
  | "duplicate_in_file";

export type ParsedContactImportRow = {
  rowNumber: number;
  phoneE164: string;
  displayName: string | null;
  email: string | null;
  tags: string[];
};

export type ContactImportRowError = {
  rowNumber: number;
  code: ContactImportErrorCode;
};

export type ParsedContactImport = {
  fileSha256: string;
  totalRows: number;
  rows: ParsedContactImportRow[];
  errors: ContactImportRowError[];
  duplicateRows: number;
};

const PHONE_HEADERS = new Set(["phone", "mobile", "whatsapp", "phone number", "رقم", "الجوال", "رقم الجوال", "واتساب"]);
const NAME_HEADERS = new Set(["name", "full name", "display name", "الاسم", "اسم العميل"]);
const EMAIL_HEADERS = new Set(["email", "e-mail", "البريد", "البريد الإلكتروني", "البريد الالكتروني"]);
const TAG_HEADERS = new Set(["tags", "tag", "labels", "التصنيفات", "وسوم"]);

function header(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function cell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseCsv(input: Buffer): string[][] {
  const text = input.toString("utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
      continue;
    }
    if (character === '"' && value.length === 0) quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function parseContactImport(input: {
  data: Buffer;
  format: ContactImportFormat;
  defaultCountryCallingCode?: string;
}): Promise<ParsedContactImport> {
  if (input.data.byteLength === 0) throw new Error("WHATSAPP_CONTACT_IMPORT_EMPTY_FILE");
  if (input.data.byteLength > MAX_CONTACT_IMPORT_BYTES) throw new Error("WHATSAPP_CONTACT_IMPORT_FILE_TOO_LARGE");

  const matrix = input.format === "csv"
    ? parseCsv(input.data)
    : (await readSheet(input.data, 1)).map((row) => row.map(cell));
  if (matrix.length === 0) throw new Error("WHATSAPP_CONTACT_IMPORT_EMPTY_FILE");
  if (matrix.length - 1 > MAX_CONTACT_IMPORT_ROWS) throw new Error("WHATSAPP_CONTACT_IMPORT_TOO_MANY_ROWS");
  if (matrix.some((row) => row.length > MAX_COLUMNS)) throw new Error("WHATSAPP_CONTACT_IMPORT_TOO_MANY_COLUMNS");

  const headers = matrix[0].map(header);
  const phoneAt = headers.findIndex((value) => PHONE_HEADERS.has(value));
  const nameAt = headers.findIndex((value) => NAME_HEADERS.has(value));
  const emailAt = headers.findIndex((value) => EMAIL_HEADERS.has(value));
  const tagsAt = headers.findIndex((value) => TAG_HEADERS.has(value));
  if (phoneAt < 0) throw new Error("WHATSAPP_CONTACT_IMPORT_MISSING_PHONE_HEADER");

  const rows: ParsedContactImportRow[] = [];
  const errors: ContactImportRowError[] = [];
  const seen = new Set<string>();
  let duplicateRows = 0;

  for (let index = 1; index < matrix.length; index += 1) {
    const source = matrix[index].map(cell);
    const rowNumber = index + 1;
    if (source.every((value) => value.length === 0)) continue;
    if (source.some((value) => value.length > MAX_CELL_LENGTH)) {
      errors.push({ rowNumber, code: "cell_too_long" });
      continue;
    }
    const phoneE164 = normalizeE164(source[phoneAt], input.defaultCountryCallingCode);
    if (!phoneE164) {
      errors.push({ rowNumber, code: "invalid_phone" });
      continue;
    }
    if (seen.has(phoneE164)) {
      duplicateRows += 1;
      errors.push({ rowNumber, code: "duplicate_in_file" });
      continue;
    }
    seen.add(phoneE164);
    const email = emailAt >= 0 ? source[emailAt].toLocaleLowerCase("en") : "";
    if (email && !validEmail(email)) {
      errors.push({ rowNumber, code: "invalid_email" });
      continue;
    }
    const tags = tagsAt < 0 ? [] : source[tagsAt]
      .split(/[,;|]/)
      .map(normalizeContactLabel)
      .filter((value): value is string => Boolean(value));
    rows.push({
      rowNumber,
      phoneE164,
      displayName: nameAt < 0 ? null : source[nameAt] || null,
      email: email || null,
      tags: [...new Set(tags)].slice(0, 20),
    });
  }

  return {
    fileSha256: createHash("sha256").update(input.data).digest("hex"),
    totalRows: matrix.slice(1).filter((row) => row.some((value) => cell(value).length > 0)).length,
    rows,
    errors: errors.slice(0, 500),
    duplicateRows,
  };
}
