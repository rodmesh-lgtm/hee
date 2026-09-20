import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { isWhatsAppCarePriority, type WhatsAppCarePriority, whatsAppCareSlaDueAt } from "./care-domain";

type CareManagementDb = Pick<PrismaClient, "$transaction">;

export async function getWhatsAppCareAssignees(input: { businessId: string; database?: PrismaClient }) {
  const database = input.database ?? db;
  const business = await database.business.findFirst({
    where: { id: input.businessId, deletedAt: null },
    select: {
      owner: { select: { id: true, name: true } },
      members: {
        where: { status: "active", role: { in: ["admin", "support"] } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        take: 100,
        select: { role: true, user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!business) return [];
  return [
    { id: business.owner.id, name: business.owner.name, role: "owner" as const },
    ...business.members.map((member) => ({ id: member.user.id, name: member.user.name, role: member.role })),
  ];
}

export async function updateWhatsAppConversationCare(input: {
  businessId: string;
  actorUserId: string;
  conversationId: string;
  assignedToUserId: string | null;
  priority: WhatsAppCarePriority;
  database?: CareManagementDb;
  now?: Date;
}) {
  if (!input.conversationId.trim() || input.conversationId.length > 128 || !isWhatsAppCarePriority(input.priority)) {
    throw new Error("WHATSAPP_CARE_UPDATE_INVALID");
  }
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.findFirst({
      where: { id: input.conversationId, businessId: input.businessId },
      select: { id: true, assignedToUserId: true, lastInboundAt: true, lastOutboundAt: true },
    });
    if (!conversation) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");

    if (input.assignedToUserId) {
      const eligible = await tx.business.findFirst({
        where: {
          id: input.businessId,
          deletedAt: null,
          OR: [
            { ownerId: input.assignedToUserId },
            { members: { some: { userId: input.assignedToUserId, status: "active", role: { in: ["admin", "support"] } } } },
          ],
        },
        select: { id: true },
      });
      if (!eligible) throw new Error("WHATSAPP_CARE_ASSIGNEE_INVALID");
    }

    const waitingForReply = Boolean(
      conversation.lastInboundAt &&
      (!conversation.lastOutboundAt || conversation.lastInboundAt > conversation.lastOutboundAt),
    );
    const slaDueAt = waitingForReply && conversation.lastInboundAt
      ? whatsAppCareSlaDueAt(input.priority, conversation.lastInboundAt)
      : null;
    await tx.whatsAppConversation.update({
      where: { id_businessId: { id: conversation.id, businessId: input.businessId } },
      data: {
        assignedToUserId: input.assignedToUserId,
        assignedAt: conversation.assignedToUserId === input.assignedToUserId ? undefined : input.assignedToUserId ? now : null,
        priority: input.priority,
        slaDueAt,
        slaRespondedAt: waitingForReply ? null : undefined,
      },
      select: { id: true },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      action: "inbox.care.update",
      targetType: "whatsapp_conversation",
      targetId: conversation.id,
      outcome: "success",
      metadata: { priority: input.priority, assigned: Boolean(input.assignedToUserId) },
      database: tx,
    });
    return { conversationId: conversation.id, slaDueAt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
