import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import type { ContactImportFormat, ParsedContactImport, ParsedContactImportRow } from "./contact-import";

type ImportDb = Pick<PrismaClient, "$transaction" | "whatsAppContactImport">;
const IMPORT_CHUNK_SIZE = 500;

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function persistChunk(database: ImportDb, businessId: string, format: ContactImportFormat, rows: ParsedContactImportRow[]) {
  return database.$transaction(async (tx) => {
    const phones = rows.map((row) => row.phoneE164);
    const existing = await tx.whatsAppContact.findMany({ where: { businessId, phoneE164: { in: phones } }, select: { phoneE164: true } });
    const existingPhones = new Set(existing.map((contact) => contact.phoneE164));
    const candidates = rows.filter((row) => !existingPhones.has(row.phoneE164));
    const created = await tx.whatsAppContact.createMany({
      data: candidates.map((row) => ({ id: randomUUID(), businessId, phoneE164: row.phoneE164, displayName: row.displayName, email: row.email, source: format === "xlsx" ? "excel" : "csv" })),
      skipDuplicates: true,
    });
    const contacts = candidates.length ? await tx.whatsAppContact.findMany({ where: { businessId, phoneE164: { in: candidates.map((row) => row.phoneE164) } }, select: { id: true, phoneE164: true } }) : [];
    const contactByPhone = new Map(contacts.map((contact) => [contact.phoneE164, contact.id]));
    const tagByName = new Map<string, string>();
    for (const normalizedName of [...new Set(candidates.flatMap((row) => row.tags))]) {
      const tag = await tx.whatsAppContactTag.upsert({ where: { businessId_normalizedName: { businessId, normalizedName } }, create: { id: randomUUID(), businessId, name: normalizedName, normalizedName }, update: {}, select: { id: true } });
      tagByName.set(normalizedName, tag.id);
    }
    const memberships = candidates.flatMap((row) => {
      const contactId = contactByPhone.get(row.phoneE164);
      if (!contactId) return [];
      return row.tags.flatMap((tag) => { const tagId = tagByName.get(tag); return tagId ? [{ businessId, contactId, tagId }] : []; });
    });
    if (memberships.length) await tx.whatsAppContactTagMembership.createMany({ data: memberships, skipDuplicates: true });
    return { importedRows: created.count, duplicateRows: rows.length - created.count };
  });
}

export async function persistContactImport(input: { businessId: string; fileName: string; format: ContactImportFormat; parsed: ParsedContactImport; database?: ImportDb }) {
  const database = input.database ?? db;
  const importId = randomUUID();
  await database.whatsAppContactImport.create({ data: { id: importId, businessId: input.businessId, format: input.format, fileName: input.fileName.slice(0, 255), fileSha256: input.parsed.fileSha256, totalRows: input.parsed.totalRows, duplicateRows: input.parsed.duplicateRows, rejectedRows: input.parsed.errors.length - input.parsed.duplicateRows, errorSummary: input.parsed.errors } });
  let importedRows = 0;
  let duplicateRows = input.parsed.duplicateRows;
  const persistenceErrors: Array<{ rowNumber: number; code: string }> = [];
  for (const batch of chunks(input.parsed.rows, IMPORT_CHUNK_SIZE)) {
    try {
      const outcome = await persistChunk(database, input.businessId, input.format, batch);
      importedRows += outcome.importedRows;
      duplicateRows += outcome.duplicateRows;
    } catch {
      persistenceErrors.push(...batch.map((row) => ({ rowNumber: row.rowNumber, code: "persistence_failed" })));
    }
  }
  const rejectedRows = input.parsed.totalRows - importedRows - duplicateRows;
  const errors = [...input.parsed.errors, ...persistenceErrors].slice(0, 500);
  const status = rejectedRows > 0 || duplicateRows > 0 ? "completed_with_errors" : "completed";
  await database.whatsAppContactImport.update({ where: { id: importId }, data: { status, importedRows, duplicateRows, rejectedRows, errorSummary: errors, completedAt: new Date() } });
  return { importId, status, totalRows: input.parsed.totalRows, importedRows, duplicateRows, rejectedRows, errors };
}
