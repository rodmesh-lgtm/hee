import "server-only";

const paidCodes = new Set(["BUSINESS", "PRO"]);

export function billingProvider() {
  return String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
}

export function isPaidPlanCode(value: string | null | undefined) {
  return paidCodes.has(String(value ?? "").trim().toUpperCase());
}

export function paidPlanActivationAllowed() {
  const provider = billingProvider();
  const appEnv = String(process.env.APP_ENV ?? "").trim().toLowerCase();

  // Mock billing exists only so CI can exercise entitlement transitions. A production
  // runtime must never convert an upgrade request into a paid entitlement without a
  // real payment-provider proof path.
  return appEnv === "test" && provider === "mock";
}

export function assertPaidPlanActivationAllowed(planCode: string) {
  if (!isPaidPlanCode(planCode)) return;
  if (!paidPlanActivationAllowed()) throw new Error("PAID_BILLING_NOT_CONFIGURED");
}
