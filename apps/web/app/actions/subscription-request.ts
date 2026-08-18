"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { normalizePlanCode } from "../lib/plan-entitlements";

const PLAN_RANK = { FREE: 0, BUSINESS: 1, PRO: 2 } as const;
const UPGRADE_EVENT = "plan_upgrade_requested";

export async function requestPlanUpgradeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  const requestedPlan = normalizePlanCode(String(formData.get("plan") ?? "BUSINESS"));
  const currentPlan = normalizePlanCode(business.plan?.code);
  if (PLAN_RANK[requestedPlan] <= PLAN_RANK[currentPlan]) {
    redirect("/dashboard/branding?upgrade=current");
  }

  const recent = await db.analyticsEvent.findMany({
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
    await db.analyticsEvent.create({
      data: {
        businessId: business.id,
        eventType: UPGRADE_EVENT,
        metadata: { source: "dashboard_branding", requestedPlan, status: "pending" },
      },
    });
  }

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/settings");
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
