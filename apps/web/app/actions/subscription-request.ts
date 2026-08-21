"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { paidUpgradeRequestsEnabled } from "../lib/billing";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanRank, normalizePlanCode } from "../lib/plan-entitlements";

const UPGRADE_EVENT = "plan_upgrade_requested";

export async function requestPlanUpgradeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  const requestedPlan = normalizePlanCode(String(formData.get("plan") ?? "BUSINESS"));
  const currentPlan = normalizePlanCode(business.plan?.code);
  if (requestedPlan === "FREE" || getPlanRank(requestedPlan) <= getPlanRank(currentPlan)) redirect("/dashboard/branding?upgrade=current");
  if (!paidUpgradeRequestsEnabled()) redirect("/dashboard/branding?upgrade=billing-unavailable");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`upgrade-request:${business.id}`}))`;
    const currentBusiness = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, include: { plan: true } });
    if (!currentBusiness) return "missing" as const;

    const livePlan = normalizePlanCode(currentBusiness.plan?.code);
    if (getPlanRank(requestedPlan) <= getPlanRank(livePlan)) return "current" as const;
    const targetPlan = await tx.businessPlan.findUnique({ where: { code: requestedPlan }, select: { id: true, isActive: true } });
    if (!targetPlan?.isActive) return "unavailable" as const;

    // Never limit this check to the most recent N events. Old pending requests remain
    // pending until explicitly resolved, so truncating history can create duplicates.
    const pending = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "AnalyticsEvent"
      WHERE "businessId" = ${business.id}
        AND "eventType" = ${UPGRADE_EVENT}
        AND COALESCE("metadata"->>'status', 'pending') = 'pending'
      LIMIT 1
    `;
    if (pending.length) return "already-pending" as const;

    await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: UPGRADE_EVENT, metadata: { source: "dashboard_branding", requestedPlan, status: "pending" } } });
    return "created" as const;
  });

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/settings");
  if (result === "missing") redirect("/onboarding");
  if (result === "current") redirect("/dashboard/branding?upgrade=current");
  if (result === "unavailable") redirect("/dashboard/branding?upgrade=unavailable");
  if (result === "already-pending") redirect("/dashboard/branding?upgrade=pending");
  redirect(`/dashboard/branding?upgrade=${requestedPlan.toLowerCase()}`);
}
