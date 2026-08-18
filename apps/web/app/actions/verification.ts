"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanEntitlements } from "../lib/plan-entitlements";

const VERIFICATION_EVENT = "verification_requested";

function eventStatus(metadata: unknown) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? String((metadata as Record<string, unknown>).status ?? "pending")
    : "pending";
}

async function pendingVerificationEvent(businessId: string) {
  const events = await db.analyticsEvent.findMany({
    where: { businessId, eventType: VERIFICATION_EVENT },
    orderBy: { createdAt: "desc" },
    select: { id: true, metadata: true },
    take: 20,
  });
  return events.find((event) => eventStatus(event.metadata) === "pending") ?? null;
}

export async function requestVerificationAction() {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");
  if (business.isVerified) redirect("/dashboard/branding?verification=verified");

  const entitlements = getPlanEntitlements(business.plan?.code);
  if (!entitlements.verificationEligible) redirect("/dashboard/branding?verification=upgrade");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verification-request:${business.id}`}))`;

    const currentBusiness = await tx.business.findFirst({
      where: { id: business.id, deletedAt: null },
      include: { plan: true },
    });
    if (!currentBusiness) return "missing" as const;
    if (currentBusiness.isVerified) return "verified" as const;
    if (!getPlanEntitlements(currentBusiness.plan?.code).verificationEligible) return "upgrade" as const;

    const events = await tx.analyticsEvent.findMany({
      where: { businessId: business.id, eventType: VERIFICATION_EVENT },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
      take: 20,
    });
    const hasPending = events.some((event) => eventStatus(event.metadata) === "pending");

    if (!hasPending) {
      await tx.analyticsEvent.create({
        data: {
          businessId: business.id,
          eventType: VERIFICATION_EVENT,
          metadata: { source: "dashboard_branding", status: "pending" },
        },
      });
    }
    return "requested" as const;
  });

  revalidatePath("/dashboard/branding");
  if (result === "missing") redirect("/login");
  if (result === "verified") redirect("/dashboard/branding?verification=verified");
  if (result === "upgrade") redirect("/dashboard/branding?verification=upgrade");
  redirect("/dashboard/branding?verification=requested");
}

export async function hasPendingVerificationRequest(businessId: string) {
  return Boolean(await pendingVerificationEvent(businessId));
}
