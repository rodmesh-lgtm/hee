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

  // Legacy manual activation remains a CI-only fixture. Production paid entitlement
  // changes are performed exclusively by the provider-verified Moyasar billing ledger.
  return appEnv === "test" && provider === "mock";
}

export function paidUpgradeRequestsEnabled() {
  if (paidPlanActivationAllowed()) return true;
  if (billingProvider() !== "moyasar") return false;
  return Boolean(
    String(process.env.MOYASAR_PUBLISHABLE_KEY ?? "").trim()
    && String(process.env.MOYASAR_SECRET_KEY ?? "").trim()
    && String(process.env.MOYASAR_WEBHOOK_SECRET ?? "").trim()
    && String(process.env.BILLING_TOKEN_ENCRYPTION_KEY ?? "").trim(),
  );
}

export function assertPaidPlanActivationAllowed(planCode: string) {
  if (!isPaidPlanCode(planCode)) return;
  if (!paidPlanActivationAllowed()) throw new Error("PAID_BILLING_NOT_CONFIGURED");
}
