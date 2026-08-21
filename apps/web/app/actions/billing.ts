"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { createBillingIntent } from "../lib/billing-ledger";
import { moyasarConfigured } from "../lib/moyasar";
import { normalizePlanCode } from "../lib/plan-entitlements";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export async function startPaidCheckoutAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  if (!moyasarConfigured()) redirect("/dashboard/branding?billing=unavailable");
  const plan = normalizePlanCode(String(formData.get("plan") ?? ""));
  if (plan === "FREE") redirect("/dashboard/branding?billing=invalid-plan");

  let rate;
  try {
    rate = await consumePublicWriteLimit({
      scope: "billing-checkout",
      businessId: business.id,
      identity: user.id,
      limit: 8,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    console.error("[billing] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/branding?billing=unavailable");
  }
  if (!rate.allowed) redirect("/dashboard/branding?billing=rate-limited");

  let billingId: string;
  try {
    const intent = await createBillingIntent(user.id, business.id, plan);
    billingId = intent.payment.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "PLAN_NOT_AN_UPGRADE") redirect("/dashboard/branding?billing=current");
    if (message === "PLAN_UNAVAILABLE" || message === "INVALID_PAID_PLAN") redirect("/dashboard/branding?billing=invalid-plan");
    if (message === "OTHER_CHECKOUT_PENDING") redirect("/dashboard/branding?billing=pending");
    console.error("[billing] create_intent_failed", { businessId: business.id, plan, error: message });
    redirect("/dashboard/branding?billing=unavailable");
  }
  redirect(`/dashboard/billing/checkout?billing=${encodeURIComponent(billingId)}`);
}

export async function cancelAutoRenewAction() {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-cancel:${business.id}`}))`;
    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "businessId" = ${business.id} AND "status" = 'active'
    `;
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/billing/manage");
  redirect("/dashboard/billing/manage?billing=renewal-canceled");
}
