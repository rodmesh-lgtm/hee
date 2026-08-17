"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanEntitlements } from "../lib/plan-entitlements";

const VERIFICATION_EVENT = "verification_requested";

export async function requestVerificationAction() {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  if (business.isVerified) redirect("/dashboard/branding?verification=verified");

  const entitlements = getPlanEntitlements(business.plan?.code);
  if (!entitlements.verificationEligible) redirect("/dashboard/branding?verification=upgrade");

  const existing = await db.analyticsEvent.findFirst({
    where: { businessId: business.id, eventType: VERIFICATION_EVENT },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!existing) {
    await db.analyticsEvent.create({
      data: {
        businessId: business.id,
        eventType: VERIFICATION_EVENT,
        metadata: { source: "dashboard_branding", status: "pending" },
      },
    });
  }

  revalidatePath("/dashboard/branding");
  redirect("/dashboard/branding?verification=requested");
}

export async function hasPendingVerificationRequest(businessId: string) {
  return Boolean(await db.analyticsEvent.findFirst({
    where: { businessId, eventType: VERIFICATION_EVENT },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  }));
}
