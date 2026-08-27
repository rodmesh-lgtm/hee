import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";
import { nextWhatsAppMessageStatus, type WhatsAppMessageStatus } from "./message-domain";
import { parseInboundMessages, parseStatusReceipts } from "./webhook-message-parser";

type Tx = Prisma.TransactionClient;
type ClaimedEvent = {
  id: string;
  businessId: string | null;
  provider: string;
  phoneNumberId: string | null;
  eventType: string;
  payload: Prisma.JsonValue;
};

type ProcessorDb = Pick<PrismaClient, "$transaction" | "whatsAppWebhookEvent">;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function webhookValue(payload: Prisma.JsonValue) {
  return record(payload)?.value ?? null;
}

function statusTimestampPatch(status: WhatsAppMessageStatus, at: Date | null) {
  if (!at) return {};
  if (status === "sent") return { sentAt: at };
  if (status === "delivered") return { deliveredAt: at };
  if (status === "read") return { readAt: at };
  if (status === "failed") return { failedAt: at };
  return {};
}

async function processInbound(tx: Tx, event: ClaimedEvent) {
  if (!event.businessId || !event.phoneNumberId) throw new Error("WHATSAPP_WEBHOOK_TENANT_CONTEXT_MISSING");
  const messages = parseInboundMessages(webhookValue(event.payload));

  for (const incoming of messages) {
    const conversation: { id: string; businessId: string } = await tx.whatsAppConversation.upsert({
      where: {
        businessId_phoneNumberId_customerPhoneE164: {
          businessId: event.businessId,
          phoneNumberId: event.phoneNumberId,
          customerPhoneE164: incoming.customerPhoneE164,
        },
      },
      create: {
        id: randomUUID(),
        businessId: event.businessId,
        phoneNumberId: event.phoneNumberId,
        customerPhoneE164: incoming.customerPhoneE164,
        customerDisplayName: incoming.customerDisplayName,
        lastMessageAt: incoming.providerTimestamp,
        lastInboundAt: incoming.providerTimestamp,
      },
      update: {
        ...(incoming.customerDisplayName ? { customerDisplayName: incoming.customerDisplayName } : {}),
        lastMessageAt: incoming.providerTimestamp,
        lastInboundAt: incoming.providerTimestamp,
      },
      select: { id: true, businessId: true },
    });
    if (conversation.businessId !== event.businessId) throw new Error("WHATSAPP_CONVERSATION_TENANT_MISMATCH");

    const existing = await tx.whatsAppMessage.findUnique({
      where: { provider_providerMessageId: { provider: event.provider, providerMessageId: incoming.providerMessageId } },
      select: { businessId: true, conversationId: true },
    });
    if (existing) {
      if (existing.businessId !== event.businessId || existing.conversationId !== conversation.id) {
        throw new Error("WHATSAPP_MESSAGE_ID_TENANT_COLLISION");
      }
      continue;
    }

    await tx.whatsAppMessage.create({
      data: {
        id: randomUUID(),
        businessId: event.businessId,
        conversationId: conversation.id,
        provider: event.provider,
        providerMessageId: incoming.providerMessageId,
        direction: "inbound",
        messageType: incoming.messageType,
        status: "received",
        textBody: incoming.textBody,
        payload: incoming.payload as Prisma.InputJsonValue,
        providerTimestamp: incoming.providerTimestamp,
      },
    });
  }
}

async function processStatuses(tx: Tx, event: ClaimedEvent) {
  if (!event.businessId) throw new Error("WHATSAPP_WEBHOOK_TENANT_CONTEXT_MISSING");
  const receipts = parseStatusReceipts(webhookValue(event.payload));

  for (const receipt of receipts) {
    const message = await tx.whatsAppMessage.findUnique({
      where: { provider_providerMessageId: { provider: event.provider, providerMessageId: receipt.providerMessageId } },
      select: { id: true, businessId: true, status: true },
    });
    if (!message) throw new Error("WHATSAPP_STATUS_MESSAGE_NOT_FOUND");
    if (message.businessId !== event.businessId) throw new Error("WHATSAPP_STATUS_TENANT_MISMATCH");

    const next = nextWhatsAppMessageStatus(message.status as WhatsAppMessageStatus, receipt.status);
    if (next === message.status) continue;
    await tx.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: next,
        ...statusTimestampPatch(next, receipt.providerTimestamp),
        ...(next === "failed" ? { errorCode: receipt.errorCode, errorMessage: receipt.errorMessage } : {}),
      },
    });
  }
}

async function claimNext(tx: Tx): Promise<ClaimedEvent | null> {
  const rows = await tx.$queryRaw<ClaimedEvent[]>`
    SELECT "id", "businessId", "provider", "phoneNumberId", "eventType", "payload"
    FROM "WhatsAppWebhookEvent"
    WHERE "processedAt" IS NULL
    ORDER BY "receivedAt" ASC, "id" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function processNextWhatsAppWebhookEvent(database: ProcessorDb = db) {
  let claimedId: string | null = null;
  try {
    return await database.$transaction(async (tx) => {
      const event = await claimNext(tx);
      if (!event) return { processed: false as const };
      claimedId = event.id;

      if (event.eventType === "message_received") await processInbound(tx, event);
      else if (event.eventType === "message_status") await processStatuses(tx, event);

      await tx.whatsAppWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), processingError: null },
      });
      return { processed: true as const, id: event.id, eventType: event.eventType };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WHATSAPP_WEBHOOK_PROCESSING_FAILED";
    if (claimedId) {
      await database.whatsAppWebhookEvent.updateMany({
        where: { id: claimedId, processedAt: null },
        data: { processingError: message.slice(0, 512) },
      });
    }
    return { processed: false as const, id: claimedId, error: message };
  }
}
