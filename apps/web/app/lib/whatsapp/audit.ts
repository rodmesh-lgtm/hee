import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";

const FORBIDDEN_KEY = /token|secret|credential|authorization|code|state|message|body|phone/i;
type SafeScalar = string | number | boolean | null;

export function safeWhatsAppAuditMetadata(value?: Record<string, SafeScalar>) {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([key, item]) => !FORBIDDEN_KEY.test(key) && (item === null || ["string", "number", "boolean"].includes(typeof item))).slice(0, 16);
  return Object.fromEntries(entries.map(([key, item]) => [key.slice(0, 64), typeof item === "string" ? item.slice(0, 256) : item]));
}

export async function writeWhatsAppAuditLog(input: {
  businessId: string; actorUserId?: string | null; actorType?: "user" | "worker" | "system";
  action: string; targetType: string; targetId?: string | null; outcome: "success" | "denied" | "failed" | "cancelled";
  metadata?: Record<string, SafeScalar>; database?: PrismaClient | Prisma.TransactionClient;
}) {
  const database = input.database ?? db;
  return database.whatsAppAuditLog.create({ data: {
    businessId: input.businessId, actorUserId: input.actorUserId ?? null, actorType: input.actorType ?? "user",
    action: input.action.slice(0, 80), targetType: input.targetType.slice(0, 80), targetId: input.targetId?.slice(0, 128) ?? null,
    outcome: input.outcome, metadata: safeWhatsAppAuditMetadata(input.metadata),
  }, select: { id: true } });
}
