import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";

export async function removeWhatsAppContacts(input: { businessId: string; actorUserId: string; scope: "all" | "selected"; contactIds: string[]; expectedCount: number; database?: Pick<PrismaClient, "$transaction">; now?: Date }) {
  if (!Number.isSafeInteger(input.expectedCount) || input.expectedCount < 1 || !["all", "selected"].includes(input.scope)) throw new Error("CONTACT_REMOVAL_INVALID");
  const ids = [...new Set(input.contactIds)];
  if (input.scope === "selected" && (!ids.length || ids.length > 1000 || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id)))) throw new Error("CONTACT_REMOVAL_INVALID");
  const now = input.now ?? new Date();
  return (input.database ?? db).$transaction(async tx => {
    const importing = await tx.whatsAppContactImport.count({ where: { businessId: input.businessId, status: { in: ["queued", "processing"] } } });
    if (importing) throw new Error("CONTACT_REMOVAL_IMPORT_ACTIVE");
    const where = { businessId: input.businessId, deletedAt: null, ...(input.scope === "selected" ? { id: { in: ids } } : {}) };
    const count = await tx.whatsAppContact.count({ where });
    if (count !== input.expectedCount || input.scope === "selected" && count !== ids.length) throw new Error("CONTACT_REMOVAL_CHANGED");
    await tx.whatsAppContact.updateMany({ where, data: { deletedAt: now, optedOutAt: now } });
    const contact = { businessId: input.businessId, deletedAt: now };
    await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppConsent" s SET "revokedAt" = ${now}, "updatedAt" = ${now}
      WHERE s."businessId" = ${input.businessId} AND s."source" <> 'booking' AND s."revokedAt" IS NULL
      AND EXISTS (SELECT 1 FROM "WhatsAppContact" c WHERE c."businessId" = s."businessId" AND c."phoneE164" = s."phoneE164" AND c."deletedAt" = ${now})`);
    await tx.whatsAppDeliveryJob.updateMany({ where: { businessId: input.businessId, recipient: { contact }, status: { in: ["queued", "retry_scheduled"] } }, data: { status: "cancelled", lastErrorCode: "CONTACT_REMOVED", leaseOwner: null, leaseExpiresAt: null } });
    await tx.whatsAppCampaignRecipient.updateMany({ where: { businessId: input.businessId, contact, status: { in: ["snapshotted", "queued"] } }, data: { status: "cancelled" } });
    await tx.whatsAppAutomationJob.updateMany({ where: { businessId: input.businessId, contact, status: { in: ["queued", "retry_scheduled"] } }, data: { status: "cancelled", lastErrorCode: "CONTACT_REMOVED", leaseOwner: null, leaseExpiresAt: null } });
    await tx.whatsAppSegmentMembership.deleteMany({ where: { businessId: input.businessId, contact } });
    await tx.whatsAppContactTagMembership.deleteMany({ where: { businessId: input.businessId, contact } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "contacts.remove", targetType: "contacts", targetId: input.businessId, outcome: "success", metadata: { scope: input.scope, count }, database: tx });
    return { count };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}
