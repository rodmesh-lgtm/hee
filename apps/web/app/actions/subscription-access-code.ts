"use server";
import { redirect } from "next/navigation";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { redeemSubscriptionAccessCode } from "../lib/subscription-access-code";

export async function redeemSubscriptionAccessCodeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  let rateAllowed = false;
  try {
    const rate = await consumePublicWriteLimit({
      scope: "subscription-access-code",
      businessId: business.id,
      identity: business.ownerId,
      limit: 8,
      windowSeconds: 60 * 60,
    });
    rateAllowed = rate.allowed;
  } catch (error) {
    // Access codes grant paid entitlements. If the shared limiter cannot prove that
    // this attempt is within policy, fail closed instead of bypassing protection or
    // leaking an unhandled Server Action exception to the customer. Reuse the safe
    // temporary-throttle outcome so infrastructure details are not exposed.
    console.error("[subscription-access-code] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/billing/manage?code=rate-limited");
  }
  if (!rateAllowed) redirect("/dashboard/billing/manage?code=rate-limited");

  const result = await redeemSubscriptionAccessCode(business.ownerId, business.id, formData.get("accessCode"));
  redirect(`/dashboard/billing/manage?code=${encodeURIComponent(result)}`);
}
