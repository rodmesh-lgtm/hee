import "server-only";

import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { getInfroReminderWhatsAppPhoneNumberId } from "../reminders/platform-whatsapp";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";
import { whatsAppCareSlaState } from "./care-domain";

export const WHATSAPP_CARE_OPERATIONS_LIMIT = 100;
export const WHATSAPP_CARE_FILTERS = ["all", "needs-reply", "overdue", "unassigned", "urgent", "open-window", "template-required"] as const;
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
  const platformPhoneNumberId = getInfroReminderWhatsAppPhoneNumberId();

  const conversations = await database.whatsAppConversation.findMany({
    where: {
      businessId: input.businessId,
      ...(platformPhoneNumberId ? { NOT: { phoneNumberId: platformPhoneNumberId } } : {}),
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
      priority: true,
      slaDueAt: true,
      slaRespondedAt: true,
      assignee: { select: { id: true, name: true } },
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
    const sla = whatsAppCareSlaState({ ...conversation, now });
    return { ...conversation, serviceWindow, needsReply, sla };
  });

  const summary = {
    total: items.length,
    needsReply: items.filter((item) => item.needsReply).length,
    openWindow: items.filter((item) => item.serviceWindow.open).length,
    templateRequired: items.filter((item) => !item.serviceWindow.open).length,
    overdue: items.filter((item) => item.sla.overdue).length,
    unassigned: items.filter((item) => !item.assignee).length,
  };

  const filtered = items.filter((item) => {
    if (filter === "needs-reply") return item.needsReply;
    if (filter === "overdue") return item.sla.overdue;
    if (filter === "unassigned") return !item.assignee;
    if (filter === "urgent") return item.priority === "urgent";
    if (filter === "open-window") return item.serviceWindow.open;
    if (filter === "template-required") return !item.serviceWindow.open;
    return true;
  });

  return { items: filtered, summary, query, filter, limit: WHATSAPP_CARE_OPERATIONS_LIMIT };
}
