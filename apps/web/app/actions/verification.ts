"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessForRead, getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanEntitlements } from "../lib/plan-entitlements";

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
  if (business.isVerified) redirect("/dashboard/branding?verification=verified");

  const entitlements = getPlanEntitlements(business.plan?.code);
  if (!entitlements.verificationEligible) redirect("/dashboard/branding?verification=upgrade");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verification-request:${business.id}`}))`;
    const currentBusiness = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, include: { plan: true } });
    if (!currentBusiness) return "missing" as const;
    if (currentBusiness.isVerified) return "verified" as const;

    const currentEntitlements = getPlanEntitlements(currentBusiness.plan?.code);
    if (!currentEntitlements.verificationEligible) return "upgrade" as const;

    // The persisted Business.planId may lag behind subscription expiry if a renewal
    // worker is temporarily unavailable. A paid-only action must therefore re-prove
    // the live entitlement inside the same transaction instead of trusting planId.
    if (currentBusiness.plan?.code && currentBusiness.plan.code !== "FREE") {
      const activePaidSubscription = await tx.subscription.findFirst({
        where: {
          businessId: currentBusiness.id,
          planId: currentBusiness.plan.id,
          status: "active",
          endsAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!activePaidSubscription) return "upgrade" as const;
    }

    const pending = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "AnalyticsEvent"
      WHERE "businessId" = ${business.id}
        AND "eventType" = ${VERIFICATION_EVENT}
        AND COALESCE("metadata"->>'status', 'pending') = 'pending'
      LIMIT 1
    `;
    if (!pending.length) await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: VERIFICATION_EVENT, metadata: { source: "dashboard_branding", status: "pending" } } });
    return "requested" as const;
  });

  revalidatePath("/dashboard/branding");
  if (result === "missing") redirect("/login");
  if (result === "verified") redirect("/dashboard/branding?verification=verified");
  if (result === "upgrade") redirect("/dashboard/branding?verification=upgrade");
  redirect("/dashboard/branding?verification=requested");
}

export async function hasPendingVerificationRequest() {
  const business = await getOwnedBusinessForRead();
  if (!business) return false;
  return hasPendingVerificationForBusiness(business.id);
}
