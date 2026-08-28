import "server-only";

import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";

const CONVERSATION_LIMIT = 50;
const MESSAGE_LIMIT = 100;
function boundedQuery(value: string | undefined) {
  const query = value?.trim() ?? "";
  return query.length > 0 && query.length <= 64 ? query : "";
}

export async function getWhatsAppInbox(input: {
  businessId: string;
  selectedConversationId?: string;
  query?: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const query = boundedQuery(input.query);
  const conversations = await database.whatsAppConversation.findMany({
    where: {
      businessId: input.businessId,
      ...(query ? { OR: [
        { customerPhoneE164: { contains: query, mode: "insensitive" } },
        { customerDisplayName: { contains: query, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: CONVERSATION_LIMIT,
    select: {
      id: true, customerPhoneE164: true, customerDisplayName: true,
      lastMessageAt: true, lastInboundAt: true, lastOutboundAt: true,
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { direction: true, messageType: true, textBody: true, status: true } },
    },
  });
  const requestedId = input.selectedConversationId?.trim();
  const selectedId = requestedId && requestedId.length <= 128 ? requestedId : conversations[0]?.id;
  const selected = selectedId ? await database.whatsAppConversation.findFirst({
    where: { id: selectedId, businessId: input.businessId },
    select: {
      id: true, customerPhoneE164: true, customerDisplayName: true,
      lastMessageAt: true, lastInboundAt: true, lastOutboundAt: true,
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: MESSAGE_LIMIT,
        select: {
          id: true, direction: true, messageType: true, status: true, textBody: true,
          errorCode: true, errorMessage: true, providerTimestamp: true,
          sentAt: true, deliveredAt: true, readAt: true, failedAt: true, createdAt: true,
        },
      },
    },
  }) : null;
  const now = input.now ?? new Date();
  return {
    conversations,
    selected: selected ? { ...selected, messages: [...selected.messages].reverse(), serviceWindow: whatsAppCustomerServiceWindow(selected.lastInboundAt, now) } : null,
    query,
    limits: { conversations: CONVERSATION_LIMIT, messages: MESSAGE_LIMIT },
  };
}
