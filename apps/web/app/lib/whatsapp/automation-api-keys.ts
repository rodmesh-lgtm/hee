import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";

type ApiKeyDb = Pick<PrismaClient, "$transaction">;

export function hashWhatsAppAutomationApiKey(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function createWhatsAppAutomationApiKey(input: {
  businessId: string; actorUserId: string; name: string; database?: ApiKeyDb;
}) {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new Error("WHATSAPP_AUTOMATION_API_KEY_NAME_INVALID");
  const database = input.database ?? db;
  const prefix = `irwa_live_${randomBytes(8).toString("hex")}`;
  const plaintext = `${prefix}.${randomBytes(32).toString("base64url")}`;
  const keyHash = hashWhatsAppAutomationApiKey(plaintext);
  const record = await database.$transaction(async (tx) => {
    const created = await tx.whatsAppAutomationApiKey.create({
      data: { id: randomUUID(), businessId: input.businessId, name, keyPrefix: prefix, keyHash, createdByUserId: input.actorUserId },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.actorUserId,
      action: "automation.api_key.create", targetType: "automation_api_key", targetId: created.id,
      outcome: "success", metadata: { name, keyPrefix: prefix }, database: tx,
    });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { ...record, plaintext };
}

export async function revokeWhatsAppAutomationApiKey(input: {
  businessId: string; actorUserId: string; keyId: string; database?: ApiKeyDb; now?: Date;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.keyId)) throw new Error("WHATSAPP_AUTOMATION_API_KEY_ID_INVALID");
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>(Prisma.sql`
      SELECT "id", "status" FROM "WhatsAppAutomationApiKey"
      WHERE "id" = ${input.keyId} AND "businessId" = ${input.businessId}
      FOR UPDATE
    `);
    const key = rows[0];
    if (!key) throw new Error("WHATSAPP_AUTOMATION_API_KEY_NOT_FOUND");
    const alreadyRevoked = key.status === "revoked";
    if (!alreadyRevoked) await tx.whatsAppAutomationApiKey.updateMany({
      where: { id: input.keyId, businessId: input.businessId, status: "active" },
      data: { status: "revoked", revokedAt: now },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.actorUserId,
      action: "automation.api_key.revoke", targetType: "automation_api_key", targetId: input.keyId,
      outcome: "success", metadata: { alreadyRevoked }, database: tx,
    });
    return { id: input.keyId, alreadyRevoked };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
