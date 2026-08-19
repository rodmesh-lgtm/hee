"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/admin";
import { getPlanEntitlements, getPlanRank, normalizePlanCode } from "../lib/plan-entitlements";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function lockAdminEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-event:${eventId}`}))`;
}
async function lockAdminBusiness(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-business:${businessId}`}))`;
}
function reviewAudit(admin: { id: string; email: string }) {
  return {
    reviewedAt: new Date().toISOString(),
    reviewedByUserId: admin.id,
    reviewedByEmail: admin.email,
  };
}

export async function approveVerificationAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) redirect("/admin?error=verification");

  const result = await db.$transaction(async (tx) => {
    await lockAdminEvent(tx, eventId);

    const event = await tx.analyticsEvent.findUnique({
      where: { id: eventId },
      select: { id: true, businessId: true, eventType: true, metadata: true },
    });
    const metadata = metadataObject(event?.metadata);
    if (!event || event.eventType !== "verification_requested" || metadata.status !== "pending") return "invalid-state" as const;

    await lockAdminBusiness(tx, event.businessId);
    const business = await tx.business.findFirst({ where: { id: event.businessId, deletedAt: null }, include: { plan: true } });
    if (!business) return "missing-business" as const;
    const audit = reviewAudit(admin);

    if (business.isVerified) {
      await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "obsolete", ...audit, reason: "already_verified" } } });
      return "already-verified" as const;
    }

    const entitlements = getPlanEntitlements(business.plan?.code);
    if (!entitlements.verificationEligible) {
      await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "obsolete", ...audit, reason: "plan_ineligible" } } });
      return "ineligible" as const;
    }

    await tx.business.update({ where: { id: event.businessId }, data: { isVerified: true } });
    await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "approved", ...audit } } });

    const duplicateRequests = await tx.analyticsEvent.findMany({
      where: { businessId: event.businessId, eventType: "verification_requested", id: { not: event.id } },
      select: { id: true, metadata: true },
    });
    for (const duplicate of duplicateRequests) {
      const duplicateMetadata = metadataObject(duplicate.metadata);
      if (String(duplicateMetadata.status ?? "pending") === "pending") {
        await tx.analyticsEvent.update({ where: { id: duplicate.id }, data: { metadata: { ...duplicateMetadata, status: "obsolete", ...audit, reason: "duplicate_request" } } });
      }
    }
    return "approved" as const;
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/branding");
  if (result === "invalid-state") redirect("/admin?error=verification-state");
  if (result === "missing-business") redirect("/admin?error=verification");
  if (result === "already-verified") redirect("/admin?done=verification-already");
  if (result === "ineligible") redirect("/admin?error=verification-ineligible");
  redirect("/admin?done=verification");
}

export async function approvePlanUpgradeAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) redirect("/admin?error=upgrade");

  const result = await db.$transaction(async (tx) => {
    await lockAdminEvent(tx, eventId);

    const event = await tx.analyticsEvent.findUnique({
      where: { id: eventId },
      select: { id: true, businessId: true, eventType: true, metadata: true },
    });
    if (!event || event.eventType !== "plan_upgrade_requested") return "missing-event" as const;

    const metadata = metadataObject(event.metadata);
    if (metadata.status !== "pending") return "invalid-state" as const;

    const requestedPlan = normalizePlanCode(String(metadata.requestedPlan ?? "BUSINESS"));
    if (requestedPlan === "FREE") return "invalid-plan" as const;

    await lockAdminBusiness(tx, event.businessId);
    const business = await tx.business.findFirst({ where: { id: event.businessId, deletedAt: null }, include: { plan: true } });
    if (!business) return "missing-business" as const;
    const audit = reviewAudit(admin);

    const currentPlan = normalizePlanCode(business.plan?.code);
    if (getPlanRank(requestedPlan) <= getPlanRank(currentPlan)) {
      await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "obsolete", ...audit, reason: "stale_upgrade" } } });
      return "stale" as const;
    }

    const plan = await tx.businessPlan.findUnique({ where: { code: requestedPlan } });
    if (!plan || !plan.isActive) return `missing-plan-${requestedPlan.toLowerCase()}` as const;

    await tx.business.update({ where: { id: event.businessId }, data: { planId: plan.id } });
    await tx.subscription.updateMany({ where: { businessId: event.businessId, status: "active" }, data: { status: "replaced", endsAt: new Date() } });
    await tx.subscription.create({ data: { businessId: event.businessId, planId: plan.id, status: "active" } });
    await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "approved", ...audit } } });

    const duplicateRequests = await tx.analyticsEvent.findMany({
      where: { businessId: event.businessId, eventType: "plan_upgrade_requested", id: { not: event.id } },
      select: { id: true, metadata: true },
    });
    for (const duplicate of duplicateRequests) {
      const duplicateMetadata = metadataObject(duplicate.metadata);
      if (String(duplicateMetadata.status ?? "pending") === "pending") {
        await tx.analyticsEvent.update({ where: { id: duplicate.id }, data: { metadata: { ...duplicateMetadata, status: "obsolete", ...audit, reason: "superseded_by_approved_upgrade" } } });
      }
    }
    return `approved-${requestedPlan.toLowerCase()}` as const;
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/settings");
  if (result === "missing-event" || result === "missing-business") redirect("/admin?error=upgrade");
  if (result === "invalid-state") redirect("/admin?error=upgrade-state");
  if (result === "invalid-plan") redirect("/admin?error=plan");
  if (result === "stale") redirect("/admin?error=stale-upgrade");
  if (result.startsWith("missing-plan-")) redirect(`/admin?error=${result}`);
  redirect(`/admin?done=${result.replace("approved-", "")}`);
}
