"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { billingProvider, paidUpgradeRequestsEnabled } from "../lib/billing";
import { createBillingIntent } from "../lib/billing-ledger";
import { moyasarConfigured } from "../lib/moyasar";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanRank, normalizePlanCode } from "../lib/plan-entitlements";
import { consumePublicWriteLimit } from "../lib/rate-limit";

const UPGRADE_EVENT = "plan_upgrade_requested";

export async function requestPlanUpgradeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  const requestedPlan = normalizePlanCode(String(formData.get("plan") ?? "BUSINESS"));
  const currentPlan = normalizePlanCode(business.plan?.code);
  if (requestedPlan === "FREE" || getPlanRank(requestedPlan) <= getPlanRank(currentPlan)) redirect("/dashboard/branding?upgrade=current");
  if (!paidUpgradeRequestsEnabled()) redirect("/dashboard/branding?upgrade=billing-unavailable");

  if (billingProvider() === "moyasar") {
    if (!moyasarConfigured()) redirect("/dashboard/branding?upgrade=billing-unavailable");
    const owner = await db.user.findFirst({ where: { id: business.ownerId, deletedAt: null }, select: { emailVerifiedAt: true } });
    if (!owner?.emailVerifiedAt) redirect("/dashboard/settings?billing=email-verification-required");

    let rate;
    try {
      rate = await consumePublicWriteLimit({
        scope: "billing-checkout",
        businessId: business.id,
        identity: business.ownerId,
        limit: 8,
        windowSeconds: 60 * 60,
      });
    } catch (error) {
      console.error("[subscription] rate_limit_failed", { businessId: business.id, error });
      redirect("/dashboard/branding?upgrade=billing-unavailable");
    }
    if (!rate.allowed) redirect("/dashboard/branding?billing=rate-limited");

    let billingId: string;
    try {
      const intent = await createBillingIntent(business.ownerId, business.id, requestedPlan);
      billingId = intent.payment.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      if (message === "PLAN_NOT_AN_UPGRADE") redirect("/dashboard/branding?upgrade=current");
      if (message === "PLAN_UNAVAILABLE" || message === "INVALID_PAID_PLAN") redirect("/dashboard/branding?upgrade=unavailable");
      if (message === "OTHER_CHECKOUT_PENDING") redirect("/dashboard/branding?billing=pending");
      console.error("[subscription] checkout_failed", { businessId: business.id, requestedPlan, error: message });
      redirect("/dashboard/branding?upgrade=billing-unavailable");
    }
    redirect(`/dashboard/billing/checkout?billing=${encodeURIComponent(billingId)}`);
  }

  // Mock billing is intentionally retained only for CI fixtures that exercise the
  // administrative transition. It is impossible to reach this branch in production.
  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`upgrade-request:${business.id}`}))`;
    const currentBusiness = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, include: { plan: true } });
    if (!currentBusiness) return "missing" as const;

    const livePlan = normalizePlanCode(currentBusiness.plan?.code);
    if (getPlanRank(requestedPlan) <= getPlanRank(livePlan)) return "current" as const;
    const targetPlan = await tx.businessPlan.findUnique({ where: { code: requestedPlan }, select: { id: true, isActive: true } });
    if (!targetPlan?.isActive) return "unavailable" as const;

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
