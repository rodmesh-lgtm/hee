import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";
import { writeWhatsAppAuditLog } from "./audit";

type ReplyQueueDb = Pick<PrismaClient, "$transaction">;
export async function enqueueWhatsAppReply(input: { businessId: string; actorUserId: string; conversationId: string; requestId: string; textBody: string; database?: ReplyQueueDb; now?: Date }) {
  const textBody = input.textBody.trim();
  if (!/^[0-9a-f-]{36}$/i.test(input.requestId) || textBody.length < 1 || textBody.length > 4096) throw new Error("WHATSAPP_REPLY_INVALID");
  const database = input.database ?? db, now = input.now ?? new Date();
  const idempotencyKey = createHash("sha256").update(`ir:whatsapp:reply:${input.businessId}:${input.conversationId}:${input.requestId}`).digest("hex");
  return database.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "WhatsAppConversation" WHERE "id" = ${input.conversationId} AND "businessId" = ${input.businessId} FOR UPDATE`);
    if (!locked[0]) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");
    const conversation = await tx.whatsAppConversation.findFirst({ where: { id: input.conversationId, businessId: input.businessId }, select: { id: true, phoneNumberId: true, lastInboundAt: true } });
    if (!conversation || !whatsAppCustomerServiceWindow(conversation.lastInboundAt, now).open) throw new Error("WHATSAPP_REPLY_WINDOW_CLOSED");
    const connection = await tx.whatsAppConnection.findFirst({ where: { businessId: input.businessId, phoneNumberId: conversation.phoneNumberId, provider: "meta", status: "connected", disabledAt: null }, select: { id: true } });
    if (!connection) throw new Error("WHATSAPP_REPLY_CONNECTION_NOT_READY");
    const existing = await tx.whatsAppReplyJob.findUnique({ where: { idempotencyKey }, select: { id: true } });
    if (existing) return { jobId: existing.id, alreadyQueued: true as const };
    const pending = await tx.whatsAppReplyJob.count({ where: { businessId: input.businessId, conversationId: conversation.id, status: { in: ["queued", "processing", "retry_scheduled"] } } });
    if (pending >= 20) throw new Error("WHATSAPP_REPLY_QUEUE_FULL");
    const job = await tx.whatsAppReplyJob.create({ data: { id: randomUUID(), businessId: input.businessId, connectionId: connection.id, conversationId: conversation.id, phoneNumberId: conversation.phoneNumberId, idempotencyKey, textBody, nextAttemptAt: now }, select: { id: true } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reply.enqueue", targetType: "reply_job", targetId: job.id, outcome: "success", metadata: { conversationId: conversation.id }, database: tx });
    return { jobId: job.id, alreadyQueued: false as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
