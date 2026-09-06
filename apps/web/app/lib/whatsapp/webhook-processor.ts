import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { getInfroReminderWhatsAppConfig } from "../reminders/platform-whatsapp";
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
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
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

function normalizeCommand(value: string | null) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const PLATFORM_OPT_OUT_COMMANDS = new Set([
  "stop", "unsubscribe", "cancel", "end", "quit",
  "الغاء", "إلغاء", "توقف", "وقف", "ايقاف", "إيقاف", "انهاء", "إنهاء", "الغاء التذكير", "إلغاء التذكير",
].map(normalizeCommand));

function isPlatformOptOut(textBody: string | null) {
  const command = normalizeCommand(textBody);
  return command.length > 0 && PLATFORM_OPT_OUT_COMMANDS.has(command);
}

function assertPlatformEvent(event: ClaimedEvent) {
  const config = getInfroReminderWhatsAppConfig();
  if (!config || !event.phoneNumberId || event.phoneNumberId !== config.phoneNumberId) throw new Error("INFRO_REMINDER_WEBHOOK_BINDING_INVALID");
  return config;
}

async function processPlatformInbound(tx: Tx, event: ClaimedEvent) {
  assertPlatformEvent(event);
  const messages = parseInboundMessages(webhookValue(event.payload));
  for (const incoming of messages) {
    if (!isPlatformOptOut(incoming.textBody)) continue;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "InfroReminderWhatsAppOptOut" ("phoneE164", "optedOutAt", "source", "providerMessageId", "updatedAt")
      VALUES (${incoming.customerPhoneE164}, ${incoming.providerTimestamp}, 'whatsapp_keyword', ${incoming.providerMessageId}, CURRENT_TIMESTAMP)
      ON CONFLICT ("phoneE164") DO UPDATE SET
        "optedOutAt"=EXCLUDED."optedOutAt",
        "source"='whatsapp_keyword',
        "providerMessageId"=EXCLUDED."providerMessageId",
        "updatedAt"=CURRENT_TIMESTAMP
    `);
  }
}

async function processInbound(tx: Tx, event: ClaimedEvent) {
  if (!event.businessId || !event.phoneNumberId) throw new Error("WHATSAPP_WEBHOOK_TENANT_CONTEXT_MISSING");
  const messages = parseInboundMessages(webhookValue(event.payload));

  for (const incoming of messages) {
    const conversation: { id: string; businessId: string } = await tx.whatsAppConversation.upsert({
      where: { businessId_phoneNumberId_customerPhoneE164: { businessId: event.businessId, phoneNumberId: event.phoneNumberId, customerPhoneE164: incoming.customerPhoneE164 } },
      create: { id: randomUUID(), businessId: event.businessId, phoneNumberId: event.phoneNumberId, customerPhoneE164: incoming.customerPhoneE164, customerDisplayName: incoming.customerDisplayName, lastMessageAt: incoming.providerTimestamp, lastInboundAt: incoming.providerTimestamp },
      update: { ...(incoming.customerDisplayName ? { customerDisplayName: incoming.customerDisplayName } : {}), lastMessageAt: incoming.providerTimestamp, lastInboundAt: incoming.providerTimestamp },
      select: { id: true, businessId: true },
    });
    if (conversation.businessId !== event.businessId) throw new Error("WHATSAPP_CONVERSATION_TENANT_MISMATCH");

    const existing = await tx.whatsAppMessage.findUnique({
      where: { provider_providerMessageId: { provider: event.provider, providerMessageId: incoming.providerMessageId } },
      select: { businessId: true, conversationId: true },
    });
    if (existing) {
      if (existing.businessId !== event.businessId || existing.conversationId !== conversation.id) throw new Error("WHATSAPP_MESSAGE_ID_TENANT_COLLISION");
      continue;
    }

    await tx.whatsAppMessage.create({
      data: { id: randomUUID(), businessId: event.businessId, conversationId: conversation.id, provider: event.provider, providerMessageId: incoming.providerMessageId, direction: "inbound", messageType: incoming.messageType, status: "received", textBody: incoming.textBody, payload: incoming.payload as Prisma.InputJsonValue, providerTimestamp: incoming.providerTimestamp },
    });
  }
}

async function applyTenantReminderFailureReceipt(tx: Tx, input: { providerMessageId: string; at: Date | null; errorCode: string | null }) {
  await tx.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status"='failed', "failedAt"=${input.at ?? new Date()}, "lastErrorCode"=${input.errorCode ?? 'META_DELIVERY_FAILED'}, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "providerMessageId"=${input.providerMessageId}
      AND "channel"='whatsapp'
      AND "whatsappSenderMode"='tenant'
      AND "status"='sent'
  `);
}

async function applyPlatformReminderFailureReceipt(tx: Tx, input: { providerMessageId: string; at: Date | null; errorCode: string | null }) {
  await tx.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status"='failed', "failedAt"=${input.at ?? new Date()}, "lastErrorCode"=${input.errorCode ?? 'META_DELIVERY_FAILED'}, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "providerMessageId"=${input.providerMessageId}
      AND "channel"='whatsapp'
      AND "whatsappSenderMode"='platform'
      AND "status"='sent'
  `);
}

async function applyPlatformReminderPositiveReceipt(tx: Tx, input: { providerMessageId: string; status: string; at: Date | null }) {
  const at = input.at ?? new Date();
  if (input.status === "delivered") {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "deliveredAt"=COALESCE("deliveredAt", ${at}), "updatedAt"=CURRENT_TIMESTAMP
      WHERE "providerMessageId"=${input.providerMessageId}
        AND "channel"='whatsapp'
        AND "whatsappSenderMode"='platform'
        AND "status"='sent'
    `);
  }
  if (input.status === "read") {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "deliveredAt"=COALESCE("deliveredAt", ${at}), "readAt"=COALESCE("readAt", ${at}), "updatedAt"=CURRENT_TIMESTAMP
      WHERE "providerMessageId"=${input.providerMessageId}
        AND "channel"='whatsapp'
        AND "whatsappSenderMode"='platform'
        AND "status"='sent'
    `);
  }
}

async function processPlatformStatuses(tx: Tx, event: ClaimedEvent) {
  assertPlatformEvent(event);
  const receipts = parseStatusReceipts(webhookValue(event.payload));
  for (const receipt of receipts) {
    if (receipt.status === "failed") {
      await applyPlatformReminderFailureReceipt(tx, { providerMessageId: receipt.providerMessageId, at: receipt.providerTimestamp, errorCode: receipt.errorCode });
      continue;
    }
    if (receipt.status === "delivered" || receipt.status === "read") {
      await applyPlatformReminderPositiveReceipt(tx, { providerMessageId: receipt.providerMessageId, status: receipt.status, at: receipt.providerTimestamp });
    }
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
    if (next !== message.status) {
      await tx.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: next, ...statusTimestampPatch(next, receipt.providerTimestamp), ...(next === "failed" ? { errorCode: receipt.errorCode, errorMessage: receipt.errorMessage } : {}) },
      });
    }
    if (next === "failed") await applyTenantReminderFailureReceipt(tx, { providerMessageId: receipt.providerMessageId, at: receipt.providerTimestamp, errorCode: receipt.errorCode });

    const delivery = await tx.whatsAppDeliveryJob.findFirst({
      where: { businessId: event.businessId, providerMessageId: receipt.providerMessageId },
      select: { id: true, recipient: { select: { id: true, status: true } } },
    });
    if (!delivery) continue;
    const recipientNext = nextWhatsAppMessageStatus(delivery.recipient.status as WhatsAppMessageStatus, receipt.status);
    if (recipientNext !== delivery.recipient.status) {
      await tx.whatsAppCampaignRecipient.update({ where: { id: delivery.recipient.id }, data: { status: recipientNext, ...statusTimestampPatch(recipientNext, receipt.providerTimestamp) } });
    }
    if (recipientNext === "failed") {
      await tx.whatsAppDeliveryJob.update({ where: { id: delivery.id }, data: { status: "failed", lastErrorCode: receipt.errorCode, lastErrorMessage: receipt.errorMessage } });
    }
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

      if (event.businessId === null && event.eventType === "message_received") await processPlatformInbound(tx, event);
      else if (event.businessId === null && event.eventType === "message_status") await processPlatformStatuses(tx, event);
      else if (event.eventType === "message_received") await processInbound(tx, event);
      else if (event.eventType === "message_status") await processStatuses(tx, event);

      await tx.whatsAppWebhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), processingError: null } });
      return { processed: true as const, id: event.id, eventType: event.eventType };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WHATSAPP_WEBHOOK_PROCESSING_FAILED";
    if (claimedId) {
      await database.whatsAppWebhookEvent.updateMany({ where: { id: claimedId, processedAt: null }, data: { processingError: message.slice(0, 512) } });
    }
    return { processed: false as const, id: claimedId, error: message };
  }
}
