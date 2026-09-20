import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { normalizeContactLabel } from "./contact-domain";
import { getInfroReminderWhatsAppPhoneNumberId } from "../reminders/platform-whatsapp";

const MAX_BUSINESS_TAGS = 200;
const MAX_CONTACT_TAGS = 20;
type ContactTagDb = Pick<PrismaClient, "$transaction">;

export function parseWhatsAppContactTagName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const normalizedName = normalizeContactLabel(name);
  return normalizedName ? { name, normalizedName } : null;
}

export async function updateWhatsAppConversationContactTag(input: {
  businessId: string;
  actorUserId: string;
  conversationId: string;
  mode: "add" | "remove";
  tagName: string;
  database?: ContactTagDb;
}) {
  const parsed = parseWhatsAppContactTagName(input.tagName);
  if (!parsed || !["add", "remove"].includes(input.mode) || !input.conversationId.trim() || input.conversationId.length > 128) throw new Error("WHATSAPP_CONTACT_TAG_INVALID");
  const database = input.database ?? db;
  const platformPhoneNumberId = getInfroReminderWhatsAppPhoneNumberId();
  return database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.findFirst({
      where: { id: input.conversationId, businessId: input.businessId, ...(platformPhoneNumberId ? { NOT: { phoneNumberId: platformPhoneNumberId } } : {}) },
      select: { id: true, customerPhoneE164: true, customerDisplayName: true },
    });
    if (!conversation) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");

    const contact = input.mode === "remove" ? await tx.whatsAppContact.findFirst({
      where: { businessId: input.businessId, phoneE164: conversation.customerPhoneE164 }, select: { id: true },
    }) : await tx.whatsAppContact.upsert({
      where: { businessId_phoneE164: { businessId: input.businessId, phoneE164: conversation.customerPhoneE164 } },
      create: { businessId: input.businessId, phoneE164: conversation.customerPhoneE164, displayName: conversation.customerDisplayName, source: "manual" },
      update: {},
      select: { id: true },
    });

    let changed = false;
    if (input.mode === "add" && contact) {
      const [tagCount, membershipCount, existingTag] = await Promise.all([
        tx.whatsAppContactTag.count({ where: { businessId: input.businessId } }),
        tx.whatsAppContactTagMembership.count({ where: { businessId: input.businessId, contactId: contact.id } }),
        tx.whatsAppContactTag.findFirst({ where: { businessId: input.businessId, normalizedName: parsed.normalizedName }, select: { id: true } }),
      ]);
      if (!existingTag && tagCount >= MAX_BUSINESS_TAGS) throw new Error("WHATSAPP_CONTACT_TAG_LIMIT_REACHED");
      const existingMembership = existingTag ? await tx.whatsAppContactTagMembership.findFirst({
        where: { businessId: input.businessId, contactId: contact.id, tagId: existingTag.id }, select: { tagId: true },
      }) : null;
      if (!existingMembership && membershipCount >= MAX_CONTACT_TAGS) throw new Error("WHATSAPP_CONTACT_TAG_CONTACT_LIMIT_REACHED");
      const tag = existingTag ?? await tx.whatsAppContactTag.create({
        data: { businessId: input.businessId, name: parsed.name, normalizedName: parsed.normalizedName }, select: { id: true },
      });
      const result = await tx.whatsAppContactTagMembership.createMany({
        data: [{ businessId: input.businessId, contactId: contact.id, tagId: tag.id }], skipDuplicates: true,
      });
      changed = result.count > 0;
    } else if (contact) {
      const tag = await tx.whatsAppContactTag.findFirst({
        where: { businessId: input.businessId, normalizedName: parsed.normalizedName }, select: { id: true },
      });
      if (tag) {
        const result = await tx.whatsAppContactTagMembership.deleteMany({
          where: { businessId: input.businessId, contactId: contact.id, tagId: tag.id },
        });
        changed = result.count > 0;
      }
    }

    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.actorUserId, action: "inbox.tags.update",
      targetType: "whatsapp_conversation", targetId: conversation.id, outcome: "success",
      metadata: { operation: input.mode, changed }, database: tx,
    });
    return { conversationId: conversation.id, changed };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
