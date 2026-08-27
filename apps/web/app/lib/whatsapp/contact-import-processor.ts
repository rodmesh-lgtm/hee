import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import type { ContactImportFormat, ParsedContactImport } from "./contact-import";

type ImportDb = Pick<PrismaClient, "$transaction" | "whatsAppContactImport">;

function errorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate_existing";
  return "persistence_failed";
}

export async function persistContactImport(input: {
  businessId: string;
  fileName: string;
  format: ContactImportFormat;
  parsed: ParsedContactImport;
  database?: ImportDb;
}) {
  const database = input.database ?? db;
  const importId = randomUUID();
  await database.whatsAppContactImport.create({
    data: {
      id: importId,
      businessId: input.businessId,
      format: input.format,
      fileName: input.fileName.slice(0, 255),
      fileSha256: input.parsed.fileSha256,
      totalRows: input.parsed.totalRows,
      duplicateRows: input.parsed.duplicateRows,
      rejectedRows: input.parsed.errors.length - input.parsed.duplicateRows,
      errorSummary: input.parsed.errors,
    },
  });

  let importedRows = 0;
  let duplicateRows = input.parsed.duplicateRows;
  const persistenceErrors: Array<{ rowNumber: number; code: string }> = [];

  for (const row of input.parsed.rows) {
    try {
      const outcome = await database.$transaction(async (tx) => {
        const existing = await tx.whatsAppContact.findUnique({
          where: { businessId_phoneE164: { businessId: input.businessId, phoneE164: row.phoneE164 } },
          select: { id: true },
        });
        if (existing) return "duplicate" as const;

        const contactId = randomUUID();
        await tx.whatsAppContact.create({
          data: {
            id: contactId,
            businessId: input.businessId,
            phoneE164: row.phoneE164,
            displayName: row.displayName,
            email: row.email,
            source: input.format === "xlsx" ? "excel" : "csv",
          },
        });

        for (const normalizedName of row.tags) {
          const tag = await tx.whatsAppContactTag.upsert({
            where: { businessId_normalizedName: { businessId: input.businessId, normalizedName } },
            create: {
              id: randomUUID(),
              businessId: input.businessId,
              name: normalizedName,
              normalizedName,
            },
            update: {},
            select: { id: true },
          });
          await tx.whatsAppContactTagMembership.create({
            data: { businessId: input.businessId, contactId, tagId: tag.id },
          });
        }
        return "imported" as const;
      });
      if (outcome === "imported") importedRows += 1;
      else duplicateRows += 1;
    } catch (error) {
      const code = errorCode(error);
      if (code === "duplicate_existing") duplicateRows += 1;
      else persistenceErrors.push({ rowNumber: row.rowNumber, code });
    }
  }

  const rejectedRows = input.parsed.totalRows - importedRows - duplicateRows;
  const errors = [...input.parsed.errors, ...persistenceErrors].slice(0, 500);
  const status = rejectedRows > 0 || duplicateRows > 0 ? "completed_with_errors" : "completed";
  await database.whatsAppContactImport.update({
    where: { id: importId },
    data: {
      status,
      importedRows,
      duplicateRows,
      rejectedRows,
      errorSummary: errors,
      completedAt: new Date(),
    },
  });

  return { importId, status, totalRows: input.parsed.totalRows, importedRows, duplicateRows, rejectedRows, errors };
}
