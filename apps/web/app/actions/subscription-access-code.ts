"use server";
import { redirect } from "next/navigation";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { redeemSubscriptionAccessCode } from "../lib/subscription-access-code";

export async function redeemSubscriptionAccessCodeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");
  const rate = await consumePublicWriteLimit({ scope: "subscription-access-code", businessId: business.id, identity: business.ownerId, limit: 8, windowSeconds: 60 * 60 });
  if (!rate.allowed) redirect("/dashboard/billing/manage?code=rate-limited");
  const result = await redeemSubscriptionAccessCode(business.ownerId, business.id, formData.get("accessCode"));
  redirect(`/dashboard/billing/manage?code=${encodeURIComponent(result)}`);
}
