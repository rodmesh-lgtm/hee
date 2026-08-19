"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanRank, normalizePlanCode } from "../lib/plan-entitlements";

const UPGRADE_EVENT = "plan_upgrade_requested";

export async function requestPlanUpgradeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  const requestedPlan = normalizePlanCode(String(formData.get("plan") ?? "BUSINESS"));
  const currentPlan = normalizePlanCode(business.plan?.code);
  if (requestedPlan === "FREE" || getPlanRank(requestedPlan) <= getPlanRank(currentPlan)) {
    redirect("/dashboard/branding?upgrade=current");
  }

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`upgrade-request:${business.id}`}))`;

    const currentBusiness = await tx.business.findFirst({
      where: { id: business.id, deletedAt: null },
      include: { plan: true },
    });
    if (!currentBusiness) return "missing" as const;

    const livePlan = normalizePlanCode(currentBusiness.plan?.code);
    if (getPlanRank(requestedPlan) <= getPlanRank(livePlan)) return "current" as const;

    const targetPlan = await tx.businessPlan.findUnique({ where: { code: requestedPlan }, select: { id: true, isActive: true } });
    if (!targetPlan?.isActive) return "unavailable" as const;

    const recent = await tx.analyticsEvent.findMany({
      where: { businessId: business.id, eventType: UPGRADE_EVENT },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { metadata: true },
    });

    const hasMatchingPending = recent.some((event) => {
      const metadata = event.metadata && typeof event.metadata === "object"
        ? event.metadata as Record<string, unknown>
        : {};
      return String(metadata.requestedPlan ?? "").toUpperCase() === requestedPlan
        && String(metadata.status ?? "pending").toLowerCase() === "pending";
    });

    if (!hasMatchingPending) {
      await tx.analyticsEvent.create({
        data: {
          businessId: business.id,
          eventType: UPGRADE_EVENT,
          metadata: { source: "dashboard_branding", requestedPlan, status: "pending" },
        },
      });
    }
    return hasMatchingPending ? "already-pending" as const : "created" as const;
  });

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/settings");
  if (result === "missing") redirect("/onboarding");
  if (result === "current") redirect("/dashboard/branding?upgrade=current");
  if (result === "unavailable") redirect("/dashboard/branding?upgrade=unavailable");
  redirect(`/dashboard/branding?upgrade=${requestedPlan.toLowerCase()}`);
}

export async function getLatestUpgradeRequest(businessId: string) {
  const event = await db.analyticsEvent.findFirst({
    where: { businessId, eventType: UPGRADE_EVENT },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, createdAt: true },
  });
  if (!event) return null;
  const metadata = event.metadata && typeof event.metadata === "object"
    ? event.metadata as Record<string, unknown>
    : {};
  return {
    requestedPlan: String(metadata.requestedPlan ?? ""),
    status: String(metadata.status ?? "pending"),
    createdAt: event.createdAt,
  };
}
