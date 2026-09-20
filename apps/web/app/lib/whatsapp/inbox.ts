import "server-only";

import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { getInfroReminderWhatsAppPhoneNumberId } from "../reminders/platform-whatsapp";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";
import { whatsAppCareSlaState } from "./care-domain";

const CONVERSATION_LIMIT = 50;
const MESSAGE_LIMIT = 100;
function boundedQuery(value: string | undefined) {
  const query = value?.trim() ?? "";
  return query.length > 0 && query.length <= 64 ? query : "";
}

function tenantInboxWhere(businessId: string, query: string) {
  const platformPhoneNumberId = getInfroReminderWhatsAppPhoneNumberId();
  return {
    businessId,
    ...(platformPhoneNumberId ? { NOT: { phoneNumberId: platformPhoneNumberId } } : {}),
    ...(query ? { OR: [
      { customerPhoneE164: { contains: query, mode: "insensitive" as const } },
      { customerDisplayName: { contains: query, mode: "insensitive" as const } },
    ] } : {}),
  };
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
  const where = tenantInboxWhere(input.businessId, query);
  const conversations = await database.whatsAppConversation.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: CONVERSATION_LIMIT,
    select: {
      id: true, customerPhoneE164: true, customerDisplayName: true,
      lastMessageAt: true, lastInboundAt: true, lastOutboundAt: true, priority: true, slaDueAt: true,
      assignee: { select: { id: true, name: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { direction: true, messageType: true, textBody: true, status: true } },
    },
  });
  const requestedId = input.selectedConversationId?.trim();
  // No implicit selection: returning to the list must work on narrow screens.
  const selectedId = requestedId && requestedId.length <= 128 ? requestedId : undefined;
  const selected = selectedId ? await database.whatsAppConversation.findFirst({
    where: { ...where, id: selectedId },
    select: {
      id: true, customerPhoneE164: true, customerDisplayName: true,
      lastMessageAt: true, lastInboundAt: true, lastOutboundAt: true, priority: true, assignedToUserId: true, assignedAt: true, slaDueAt: true, slaRespondedAt: true,
      assignee: { select: { id: true, name: true } },
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
  const [customer, history] = selected ? await Promise.all([database.whatsAppContact.findFirst({
    where: { businessId: input.businessId, phoneE164: selected.customerPhoneE164 },
    select: { id: true, displayName: true, createdAt: true, optedOutAt: true,
      tagMemberships: { where: { businessId: input.businessId }, take: 20, orderBy: { createdAt: "desc" },
        select: { tag: { select: { name: true } } } },
    },
  }), database.whatsAppConversation.findMany({
    where: { ...tenantInboxWhere(input.businessId, ""), customerPhoneE164: selected.customerPhoneE164, id: { not: selected.id } },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }], take: 10,
    select: { id: true, lastMessageAt: true, lastInboundAt: true, lastOutboundAt: true },
  })]) : [null, []];
  return {
    conversations,
    customer,
    history,
    selected: selected ? { ...selected, messages: [...selected.messages].reverse(), serviceWindow: whatsAppCustomerServiceWindow(selected.lastInboundAt, now), sla: whatsAppCareSlaState({ ...selected, now }) } : null,
    query,
    limits: { conversations: CONVERSATION_LIMIT, messages: MESSAGE_LIMIT },
  };
}
