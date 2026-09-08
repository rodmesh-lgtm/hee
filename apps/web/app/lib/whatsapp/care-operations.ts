import "server-only";

import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";

export const WHATSAPP_CARE_OPERATIONS_LIMIT = 100;
export const WHATSAPP_CARE_FILTERS = ["all", "needs-reply", "open-window", "template-required"] as const;
export type WhatsAppCareFilter = (typeof WHATSAPP_CARE_FILTERS)[number];

function boundedSearch(value: string | undefined) {
  const query = value?.trim() ?? "";
  return query.length > 0 && query.length <= 64 ? query : "";
}

function safeFilter(value: string | undefined): WhatsAppCareFilter {
  return WHATSAPP_CARE_FILTERS.includes(value as WhatsAppCareFilter) ? value as WhatsAppCareFilter : "all";
}

export async function getWhatsAppCareOperations(input: {
  businessId: string;
  query?: string;
  filter?: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const query = boundedSearch(input.query);
  const filter = safeFilter(input.filter);
  const now = input.now ?? new Date();

  const conversations = await database.whatsAppConversation.findMany({
    where: {
      businessId: input.businessId,
      ...(query ? {
        OR: [
          { customerPhoneE164: { contains: query, mode: "insensitive" } },
          { customerDisplayName: { contains: query, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: WHATSAPP_CARE_OPERATIONS_LIMIT,
    select: {
      id: true,
      customerPhoneE164: true,
      customerDisplayName: true,
      lastMessageAt: true,
      lastInboundAt: true,
      lastOutboundAt: true,
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { direction: true, status: true, messageType: true, createdAt: true },
      },
    },
  });

  const items = conversations.map((conversation) => {
    const serviceWindow = whatsAppCustomerServiceWindow(conversation.lastInboundAt, now);
    const needsReply = Boolean(
      conversation.lastInboundAt &&
      (!conversation.lastOutboundAt || conversation.lastInboundAt > conversation.lastOutboundAt),
    );
    return { ...conversation, serviceWindow, needsReply };
  });

  const summary = {
    total: items.length,
    needsReply: items.filter((item) => item.needsReply).length,
    openWindow: items.filter((item) => item.serviceWindow.open).length,
    templateRequired: items.filter((item) => !item.serviceWindow.open).length,
  };

  const filtered = items.filter((item) => {
    if (filter === "needs-reply") return item.needsReply;
    if (filter === "open-window") return item.serviceWindow.open;
    if (filter === "template-required") return !item.serviceWindow.open;
    return true;
  });

  return { items: filtered, summary, query, filter, limit: WHATSAPP_CARE_OPERATIONS_LIMIT };
}
