"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";
import { isSupportedPaidPlan } from "../lib/plan-entitlements";

// Repairs only legacy, undefined catalog plans. This is not a paid-plan upgrade
// endpoint. Keep code, grant, subscription and business pointers consistent.
export async function repairAccessCodePlanAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const codeId = String(formData.get("codeId") ?? "").trim();
  const planCode = String(formData.get("plan") ?? "").trim();
  if (!codeId || !isSupportedPaidPlan(planCode)) redirect("/admin/access-codes?access=repair-invalid");

  const result = await db.$transaction(async (tx) => {
    const identity = await tx.subscriptionAccessCode.findUnique({ where: { id: codeId }, select: { codeHash: true } });
    if (!identity) return "invalid";
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-access:${identity.codeHash}`}))`;
    const code = await tx.subscriptionAccessCode.findUnique({ where: { id: codeId }, include: { plan: true, grants: { where: { revokedAt: null } } } });
    if (!code || !code.isActive || code.revokedAt || isSupportedPaidPlan(code.plan.code) || code.plan.code.toUpperCase() === "FREE") return "invalid";
    const target = await tx.businessPlan.findFirst({ where: { code: planCode, isActive: true } });
    if (!target) return "invalid";
    const businessIds = [...new Set(code.grants.map((grant) => grant.businessId))].sort();
    for (const businessId of businessIds) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-business:${businessId}`}))`;
    }
    const now = new Date();
    for (const grant of code.grants) {
      const subscription = await tx.subscription.findFirst({ where: { id: grant.subscriptionId, businessId: grant.businessId, planId: code.planId, status: "active", provider: "access_code", providerReference: code.id, autoRenew: false, endsAt: null, startsAt: { lte: now } } });
      const business = await tx.business.findFirst({ where: { id: grant.businessId, planId: code.planId, deletedAt: null } });
      const conflictingSubscription = await tx.subscription.findFirst({ where: { businessId: grant.businessId, id: { not: grant.subscriptionId }, status: { in: ["active", "trialing", "past_due"] } } });
      const checkout = await tx.billingPayment.findFirst({ where: { businessId: grant.businessId, status: { in: ["created", "initiated", "authorized"] } } });
      if (!subscription || !business || grant.planId !== code.planId || conflictingSubscription || checkout) return "conflict";
    }
    // Validate every recipient before writing: a conflict leaves the entire code intact.
    await tx.subscriptionAccessCode.update({ where: { id: code.id }, data: { planId: target.id } });
    for (const grant of code.grants) {
      await tx.subscription.update({ where: { id: grant.subscriptionId }, data: { planId: target.id } });
      await tx.subscriptionAccessGrant.update({ where: { id: grant.id }, data: { planId: target.id } });
      await tx.business.update({ where: { id: grant.businessId }, data: { planId: target.id } });
      await tx.analyticsEvent.create({ data: { businessId: grant.businessId, eventType: "subscription_access_plan_repaired", metadata: { adminId: admin.id, codeId: code.id, grantId: grant.id, subscriptionId: grant.subscriptionId, previousPlanId: code.planId, planId: target.id } } });
    }
    return "saved";
  });
  revalidatePath("/admin/access-codes");
  revalidatePath("/dashboard", "layout");
  redirect(`/admin/access-codes?access=repair-${result}`);
}
