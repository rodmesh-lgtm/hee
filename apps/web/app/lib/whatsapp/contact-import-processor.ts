import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import type { ContactImportFormat, ParsedContactImport, ParsedContactImportRow } from "./contact-import";

const IMPORT_CHUNK_SIZE = 500;
const IMPORT_MAX_ATTEMPTS = 5;
const IMPORT_LEASE_MS = 5 * 60_000;

type ClaimedBatch = { id: string; importId: string; businessId: string; attemptCount: number; leaseOwner: string };

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function importRows(value: Prisma.JsonValue): ParsedContactImportRow[] {
  if (!Array.isArray(value) || value.length > IMPORT_CHUNK_SIZE) throw new Error("WHATSAPP_CONTACT_IMPORT_BATCH_INVALID");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("WHATSAPP_CONTACT_IMPORT_ROW_INVALID");
    const row = item as Record<string, unknown>;
    if (!Number.isInteger(row.rowNumber) || !/^\+[1-9][0-9]{7,14}$/.test(String(row.phoneE164 ?? ""))) throw new Error("WHATSAPP_CONTACT_IMPORT_ROW_INVALID");
    if (row.displayName !== null && (typeof row.displayName !== "string" || row.displayName.length > 512)) throw new Error("WHATSAPP_CONTACT_IMPORT_ROW_INVALID");
    if (row.email !== null && (typeof row.email !== "string" || row.email.length > 254)) throw new Error("WHATSAPP_CONTACT_IMPORT_ROW_INVALID");
    if (!Array.isArray(row.tags) || row.tags.length > 20 || row.tags.some((tag) => typeof tag !== "string" || tag.length < 1 || tag.length > 80)) throw new Error("WHATSAPP_CONTACT_IMPORT_ROW_INVALID");
    return row as ParsedContactImportRow;
  });
}

export async function enqueueContactImport(input: {
  businessId: string; fileName: string; format: ContactImportFormat; parsed: ParsedContactImport;
  consentEvidence?: string | null; database?: PrismaClient;
}) {
  const database = input.database ?? db;
  const evidence = input.consentEvidence?.trim().slice(0, 500) || null;
  const existing = await database.whatsAppContactImport.findUnique({
    where: { businessId_fileSha256: { businessId: input.businessId, fileSha256: input.parsed.fileSha256 } },
    select: { id: true, status: true },
  });
  if (existing) return { importId: existing.id, status: existing.status, alreadyQueued: true as const };

  const batches = chunks(input.parsed.rows, IMPORT_CHUNK_SIZE);
  const rejectedRows = Math.max(0, input.parsed.totalRows - input.parsed.rows.length - input.parsed.duplicateRows);
  const initialStatus = batches.length ? "queued" : "completed_with_errors";
  const importId = randomUUID();
  try {
    await database.$transaction(async (tx) => {
      await tx.whatsAppContactImport.create({
        data: {
          id: importId, businessId: input.businessId, format: input.format,
          fileName: input.fileName.slice(0, 255), fileSha256: input.parsed.fileSha256,
          status: initialStatus, totalRows: input.parsed.totalRows,
          duplicateRows: input.parsed.duplicateRows,
          rejectedRows,
          errorSummary: input.parsed.errors as Prisma.InputJsonValue,
          consentConfirmed: Boolean(evidence), consentEvidence: evidence,
          completedAt: batches.length ? null : new Date(),
        },
      });
      if (batches.length) {
        await tx.whatsAppContactImportBatch.createMany({
          data: batches.map((rows, batchIndex) => ({
            id: randomUUID(), importId, businessId: input.businessId, batchIndex,
            rows: rows as Prisma.InputJsonValue,
          })),
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await database.whatsAppContactImport.findUniqueOrThrow({
        where: { businessId_fileSha256: { businessId: input.businessId, fileSha256: input.parsed.fileSha256 } },
        select: { id: true, status: true },
      });
      return { importId: duplicate.id, status: duplicate.status, alreadyQueued: true as const };
    }
    throw error;
  }
  return { importId, status: initialStatus, alreadyQueued: false as const };
}

async function claimNextBatch(database: PrismaClient, workerId: string, now: Date): Promise<ClaimedBatch | null> {
  return database.$transaction(async (tx) => {
    await tx.whatsAppContactImportBatch.updateMany({
      where: { status: "processing", leaseExpiresAt: { lt: now }, attemptCount: { lt: IMPORT_MAX_ATTEMPTS } },
      data: { status: "queued", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "WORKER_LEASE_EXPIRED", nextAttemptAt: now },
    });
    const exhausted = await tx.whatsAppContactImportBatch.findMany({
      where: { status: "processing", leaseExpiresAt: { lt: now }, attemptCount: { gte: IMPORT_MAX_ATTEMPTS } },
      select: { id: true, importId: true, businessId: true },
      take: 100,
    });
    if (exhausted.length) {
      const failedImportIds = [...new Set(exhausted.map((item) => item.importId))];
      await tx.whatsAppContactImportBatch.updateMany({
        where: { id: { in: exhausted.map((item) => item.id) } },
        data: { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "WORKER_LEASE_EXHAUSTED" },
      });
      await tx.whatsAppContactImportBatch.updateMany({
        where: { importId: { in: failedImportIds }, status: "queued" },
        data: { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "IMPORT_ABORTED_AFTER_BATCH_FAILURE" },
      });
      await tx.whatsAppContactImport.updateMany({
        where: { id: { in: failedImportIds } },
        data: { status: "failed", completedAt: now },
      });
      for (const importId of failedImportIds) {
        const businessId = exhausted.find((item) => item.importId === importId)!.businessId;
        await writeWhatsAppAuditLog({ businessId, actorType: "worker", action: "contacts.import.complete", targetType: "contact_import", targetId: importId, outcome: "failed", metadata: { reason: "WORKER_LEASE_EXHAUSTED" }, database: tx });
      }
    }
    const rows = await tx.$queryRaw<Array<Omit<ClaimedBatch, "leaseOwner">>>(Prisma.sql`
      SELECT b."id", b."importId", b."businessId", b."attemptCount"
      FROM "WhatsAppContactImportBatch" b
      INNER JOIN "WhatsAppContactImport" i
        ON i."id" = b."importId" AND i."businessId" = b."businessId"
      WHERE b."status" = 'queued' AND b."nextAttemptAt" <= ${now}
        AND i."status" IN ('queued', 'processing')
      ORDER BY b."nextAttemptAt", b."createdAt", b."batchIndex"
      FOR UPDATE OF b SKIP LOCKED LIMIT 1
    `);
    const batch = rows[0];
    if (!batch) return null;
    await tx.whatsAppContactImportBatch.update({
      where: { id: batch.id },
      data: { status: "processing", attemptCount: { increment: 1 }, leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + IMPORT_LEASE_MS), lastErrorCode: null },
    });
    await tx.whatsAppContactImport.update({ where: { id: batch.importId }, data: { status: "processing" } });
    return { ...batch, attemptCount: batch.attemptCount + 1, leaseOwner: workerId };
  });
}

async function completeClaimedBatch(database: PrismaClient, claimed: ClaimedBatch, now: Date) {
  return database.$transaction(async (tx) => {
    const batch = await tx.whatsAppContactImportBatch.findFirst({
      where: { id: claimed.id, importId: claimed.importId, businessId: claimed.businessId, status: "processing", leaseOwner: claimed.leaseOwner },
      select: { id: true, rows: true, contactImport: { select: { format: true, consentConfirmed: true, consentEvidence: true } } },
    });
    if (!batch) throw new Error("WHATSAPP_CONTACT_IMPORT_LEASE_LOST");
    const rows = importRows(batch.rows);
    const phones = rows.map((row) => row.phoneE164);
    const existing = await tx.whatsAppContact.findMany({ where: { businessId: claimed.businessId, phoneE164: { in: phones } }, select: { phoneE164: true } });
    const existingPhones = new Set(existing.map((contact) => contact.phoneE164));
    const candidates = rows.filter((row) => !existingPhones.has(row.phoneE164));
    const created = await tx.whatsAppContact.createMany({
      data: candidates.map((row) => ({ id: randomUUID(), businessId: claimed.businessId, phoneE164: row.phoneE164, displayName: row.displayName, email: row.email, source: batch.contactImport.format === "xlsx" ? "excel" : "csv" })),
      skipDuplicates: true,
    });
    const contacts = rows.length ? await tx.whatsAppContact.findMany({ where: { businessId: claimed.businessId, phoneE164: { in: phones } }, select: { id: true, phoneE164: true } }) : [];
    const contactByPhone = new Map(contacts.map((contact) => [contact.phoneE164, contact.id]));
    const tagNames = [...new Set(rows.flatMap((row) => row.tags))];
    if (tagNames.length) {
      await tx.whatsAppContactTag.createMany({
        data: tagNames.map((normalizedName) => ({ id: randomUUID(), businessId: claimed.businessId, name: normalizedName, normalizedName })),
        skipDuplicates: true,
      });
    }
    const tags = tagNames.length ? await tx.whatsAppContactTag.findMany({ where: { businessId: claimed.businessId, normalizedName: { in: tagNames } }, select: { id: true, normalizedName: true } }) : [];
    const tagByName = new Map(tags.map((tag) => [tag.normalizedName, tag.id]));
    const memberships = rows.flatMap((row) => {
      const contactId = contactByPhone.get(row.phoneE164);
      if (!contactId) return [];
      return row.tags.flatMap((tag) => { const tagId = tagByName.get(tag); return tagId ? [{ businessId: claimed.businessId, contactId, tagId }] : []; });
    });
    if (memberships.length) await tx.whatsAppContactTagMembership.createMany({ data: memberships, skipDuplicates: true });
    const consented = batch.contactImport.consentConfirmed && batch.contactImport.consentEvidence
      ? await tx.whatsAppConsent.createMany({ data: rows.map((row) => ({ id: randomUUID(), businessId: claimed.businessId, phoneE164: row.phoneE164, source: "manual_import", evidence: batch.contactImport.consentEvidence!, consentedAt: now })), skipDuplicates: true })
      : { count: 0 };
    const duplicateRows = rows.length - created.count;
    await tx.whatsAppContactImportBatch.update({ where: { id: batch.id }, data: { status: "completed", leaseOwner: null, leaseExpiresAt: null, completedAt: now } });
    const contactImport = await tx.whatsAppContactImport.update({
      where: { id: claimed.importId },
      data: { importedRows: { increment: created.count }, duplicateRows: { increment: duplicateRows } },
      select: { importedRows: true, duplicateRows: true, rejectedRows: true },
    });
    const remaining = await tx.whatsAppContactImportBatch.count({ where: { importId: claimed.importId, businessId: claimed.businessId, status: { not: "completed" } } });
    if (remaining === 0) {
      const status = contactImport.duplicateRows > 0 || contactImport.rejectedRows > 0 ? "completed_with_errors" : "completed";
      await tx.whatsAppContactImport.update({ where: { id: claimed.importId }, data: { status, completedAt: now } });
      await writeWhatsAppAuditLog({ businessId: claimed.businessId, actorType: "worker", action: "contacts.import.complete", targetType: "contact_import", targetId: claimed.importId, outcome: "success", metadata: { importedRows: contactImport.importedRows, duplicateRows: contactImport.duplicateRows, rejectedRows: contactImport.rejectedRows }, database: tx });
    }
    return { importedRows: created.count, duplicateRows, consented: consented.count, completed: remaining === 0 };
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function processNextContactImportBatch(input: { database?: PrismaClient; workerId?: string; now?: Date } = {}) {
  const database = input.database ?? db;
  const workerId = input.workerId ?? `contact-import-${randomUUID()}`;
  const now = input.now ?? new Date();
  const claimed = await claimNextBatch(database, workerId, now);
  if (!claimed) return { processed: false as const };
  try {
    const result = await completeClaimedBatch(database, claimed, now);
    return { processed: true as const, batchId: claimed.id, importId: claimed.importId, ...result };
  } catch (error) {
    const code = (error instanceof Error ? error.message : "WHATSAPP_CONTACT_IMPORT_PROCESSING_FAILED").slice(0, 128);
    const exhausted = claimed.attemptCount >= IMPORT_MAX_ATTEMPTS;
    await database.$transaction(async (tx) => {
      const released = await tx.whatsAppContactImportBatch.updateMany({
        where: { id: claimed.id, status: "processing", leaseOwner: claimed.leaseOwner },
        data: exhausted
          ? { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: code }
          : { status: "queued", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: code, nextAttemptAt: new Date(now.getTime() + Math.min(15 * 60_000, 2 ** claimed.attemptCount * 5_000)) },
      });
      if (released.count && exhausted) {
        await tx.whatsAppContactImportBatch.updateMany({
          where: { importId: claimed.importId, businessId: claimed.businessId, status: "queued" },
          data: { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "IMPORT_ABORTED_AFTER_BATCH_FAILURE" },
        });
        await tx.whatsAppContactImport.update({ where: { id: claimed.importId }, data: { status: "failed", completedAt: now } });
        await writeWhatsAppAuditLog({ businessId: claimed.businessId, actorType: "worker", action: "contacts.import.complete", targetType: "contact_import", targetId: claimed.importId, outcome: "failed", metadata: { reason: code }, database: tx });
      }
    });
    return { processed: false as const, batchId: claimed.id, importId: claimed.importId, retryScheduled: !exhausted, error: code };
  }
}

export async function retryFailedContactImport(input: { businessId: string; importId: string; database?: PrismaClient }) {
  const database = input.database ?? db;
  return database.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppContactImport"
      WHERE "id" = ${input.importId} AND "businessId" = ${input.businessId} AND "status" = 'failed'
      FOR UPDATE
    `);
    if (!locked[0]) throw new Error("WHATSAPP_CONTACT_IMPORT_NOT_RETRYABLE");
    const processing = await tx.whatsAppContactImportBatch.count({ where: { importId: input.importId, businessId: input.businessId, status: "processing" } });
    if (processing) throw new Error("WHATSAPP_CONTACT_IMPORT_STILL_PROCESSING");
    const batches = await tx.whatsAppContactImportBatch.updateMany({
      where: { importId: input.importId, businessId: input.businessId, status: "failed" },
      data: { status: "queued", attemptCount: 0, nextAttemptAt: new Date(), leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null, completedAt: null },
    });
    if (!batches.count) throw new Error("WHATSAPP_CONTACT_IMPORT_NO_FAILED_BATCHES");
    await tx.whatsAppContactImport.update({ where: { id: input.importId }, data: { status: "queued", completedAt: null } });
    return { queuedBatches: batches.count };
  });
}
