"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/admin";
import { normalizePlanCode } from "../lib/plan-entitlements";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function approveVerificationAdminAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) redirect("/admin?error=verification");

  const event = await db.analyticsEvent.findUnique({ where: { id: eventId }, select: { id: true, businessId: true, eventType: true, metadata: true } });
  if (!event || event.eventType !== "verification_requested") redirect("/admin?error=verification");

  await db.$transaction([
    db.business.update({ where: { id: event.businessId }, data: { isVerified: true } }),
    db.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadataObject(event.metadata), status: "approved", reviewedAt: new Date().toISOString() } } }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard/branding");
  redirect("/admin?done=verification");
}

export async function approvePlanUpgradeAdminAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) redirect("/admin?error=upgrade");

  const event = await db.analyticsEvent.findUnique({ where: { id: eventId }, select: { id: true, businessId: true, eventType: true, metadata: true } });
  if (!event || event.eventType !== "plan_upgrade_requested") redirect("/admin?error=upgrade");

  const metadata = metadataObject(event.metadata);
  const requestedPlan = normalizePlanCode(String(metadata.requestedPlan ?? "BUSINESS"));
  if (requestedPlan === "FREE") redirect("/admin?error=plan");
  const plan = await db.businessPlan.findUnique({ where: { code: requestedPlan } });
  if (!plan || !plan.isActive) redirect(`/admin?error=missing-plan-${requestedPlan.toLowerCase()}`);

  await db.$transaction(async (tx) => {
    await tx.business.update({ where: { id: event.businessId }, data: { planId: plan.id } });
    await tx.subscription.updateMany({ where: { businessId: event.businessId, status: "active" }, data: { status: "replaced", endsAt: new Date() } });
    await tx.subscription.create({ data: { businessId: event.businessId, planId: plan.id, status: "active" } });
    await tx.analyticsEvent.update({ where: { id: event.id }, data: { metadata: { ...metadata, status: "approved", reviewedAt: new Date().toISOString() } } });
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/settings");
  redirect(`/admin?done=${requestedPlan.toLowerCase()}`);
}
