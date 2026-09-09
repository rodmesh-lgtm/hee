"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { normalizeContactLabel } from "../lib/whatsapp/contact-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";

const MAX_STATIC_SEGMENTS = 100;

function segmentName(form: FormData) {
  const value = String(form.get("name") ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!value || value.length > 80) return null;
  const normalizedName = normalizeContactLabel(value);
  return normalizedName ? { name: value, normalizedName } : null;
}

export async function createEligibleAudienceSegmentAction(form: FormData) {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }

  const parsedName = segmentName(form);
  if (!parsedName) redirect("/dashboard/whatsapp/contacts?segment=invalid#segments");

  let destination = "/dashboard/whatsapp/contacts?segment=failed#segments";
  let auditTargetId: string | undefined;
  try {
    const result = await db.$transaction(async (tx) => {
      const [existing, segmentCount] = await Promise.all([
        tx.whatsAppSegment.findFirst({
          where: { businessId: context.businessId, normalizedName: parsedName.normalizedName },
          select: { id: true },
        }),
        tx.whatsAppSegment.count({ where: { businessId: context.businessId, kind: "static" } }),
      ]);
      if (existing) throw new Error("WHATSAPP_SEGMENT_NAME_EXISTS");
      if (segmentCount >= MAX_STATIC_SEGMENTS) throw new Error("WHATSAPP_SEGMENT_LIMIT_REACHED");

      const segment = await tx.whatsAppSegment.create({
        data: {
          businessId: context.businessId,
          name: parsedName.name,
          normalizedName: parsedName.normalizedName,
          kind: "static",
          definition: Prisma.DbNull,
        },
        select: { id: true },
      });

      const memberCount = await tx.$executeRaw(Prisma.sql`
        INSERT INTO "WhatsAppSegmentMembership" ("businessId", "contactId", "segmentId", "createdAt")
        SELECT contact."businessId", contact."id", ${segment.id}, CURRENT_TIMESTAMP
        FROM "WhatsAppContact" contact
        INNER JOIN "WhatsAppConsent" consent
          ON consent."businessId" = contact."businessId"
          AND consent."phoneE164" = contact."phoneE164"
        WHERE contact."businessId" = ${context.businessId}
          AND contact."optedOutAt" IS NULL
          AND consent."revokedAt" IS NULL
          AND consent."consentedAt" <= CURRENT_TIMESTAMP
        ON CONFLICT ("contactId", "segmentId") DO NOTHING
      `);
      if (memberCount < 1) throw new Error("WHATSAPP_SEGMENT_EMPTY_AUDIENCE");
      return { segmentId: segment.id, memberCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    auditTargetId = result.segmentId;
    await writeWhatsAppAuditLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      action: "audience.segment.create",
      targetType: "whatsapp_segment",
      targetId: result.segmentId,
      outcome: "success",
      metadata: { memberCount: result.memberCount, source: "eligible_audience_snapshot" },
    });
    revalidatePath("/dashboard/whatsapp/contacts");
    revalidatePath("/dashboard/whatsapp/campaigns");
    destination = `/dashboard/whatsapp/contacts?segment=created&count=${result.memberCount}#segments`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      action: "audience.segment.create",
      targetType: "whatsapp_segment",
      targetId: auditTargetId,
      outcome: "failed",
      metadata: { reason },
    }).catch(() => undefined);
    if (reason === "WHATSAPP_SEGMENT_NAME_EXISTS") destination = "/dashboard/whatsapp/contacts?segment=exists#segments";
    else if (reason === "WHATSAPP_SEGMENT_LIMIT_REACHED") destination = "/dashboard/whatsapp/contacts?segment=limit#segments";
    else if (reason === "WHATSAPP_SEGMENT_EMPTY_AUDIENCE") destination = "/dashboard/whatsapp/contacts?segment=empty#segments";
  }
  redirect(destination);
}
