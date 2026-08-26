import "server-only";

import type { MoyasarPayment } from "./moyasar";

export const BILLING_CHECKOUT_TTL_MS = 60 * 60 * 1000;

export function billingCheckoutExpired(createdAt: Date, now = new Date()) {
  return now.getTime() - createdAt.getTime() > BILLING_CHECKOUT_TTL_MS;
}

export function providerPaymentCreatedWithinBillingWindow(
  billingCreatedAt: Date,
  payment: Pick<MoyasarPayment, "created_at">,
) {
  const providerCreatedAt = String(payment.created_at ?? "").trim();
  if (!providerCreatedAt) return false;
  const parsed = new Date(providerCreatedAt);
  if (Number.isNaN(parsed.getTime())) return false;

  // Allow small clock skew, but never let a fresh provider charge resurrect a stale
  // HEE checkout. A payment created within the original hour can settle later and is
  // still valid; only its creation time is bounded here.
  const maxCreatedAt = billingCreatedAt.getTime() + BILLING_CHECKOUT_TTL_MS + 2 * 60 * 1000;
  return parsed.getTime() <= maxCreatedAt;
}
