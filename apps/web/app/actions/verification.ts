"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessForRead, getOwnedBusinessWithPlanForWrite } from "../lib/ownership";

const VERIFICATION_EVENT = "verification_requested";

async function hasPendingVerificationForBusiness(businessId: string) {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "AnalyticsEvent"
    WHERE "businessId" = ${businessId}
      AND "eventType" = ${VERIFICATION_EVENT}
      AND COALESCE("metadata"->>'status', 'pending') = 'pending'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function requestVerificationAction() {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");
  if (business.isVerified) redirect("/dashboard/verification?verification=verified");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verification-request:${business.id}`}))`;
    const currentBusiness = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, select: { id: true, ownerId: true, isVerified: true } });
    if (!currentBusiness) return "missing" as const;
    if (currentBusiness.isVerified) return "verified" as const;

    const pending = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "AnalyticsEvent"
      WHERE "businessId" = ${business.id}
        AND "eventType" = ${VERIFICATION_EVENT}
        AND COALESCE("metadata"->>'status', 'pending') = 'pending'
      LIMIT 1
    `;
    if (!pending.length) await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: VERIFICATION_EVENT, metadata: { source: "dashboard_verification", status: "pending", requestedAt: new Date().toISOString() } } });
    return "requested" as const;
  });

  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard/branding");
  revalidatePath("/admin");
  if (result === "missing") redirect("/login");
  if (result === "verified") redirect("/dashboard/verification?verification=verified");
  redirect("/dashboard/verification?verification=requested");
}

export async function hasPendingVerificationRequest() {
  const business = await getOwnedBusinessForRead();
  if (!business) return false;
  return hasPendingVerificationForBusiness(business.id);
}
