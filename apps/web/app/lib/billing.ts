import "server-only";
import { isExplicitTestRuntime, isProductionRuntime } from "./runtime-environment";

const paidCodes = new Set(["BUSINESS", "PRO"]);

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function billingProvider() {
  return String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
}

export function isPaidPlanCode(value: string | null | undefined) {
  return paidCodes.has(String(value ?? "").trim().toUpperCase());
}

export function paidPlanActivationAllowed() {
  const provider = billingProvider();

  // Legacy manual activation remains a CI-only fixture. A Vercel Production signal
  // always wins over a drifting APP_ENV=test value.
  return isExplicitTestRuntime() && provider === "mock";
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

/**
 * Controls whether a customer may create a new paid checkout intent.
 * Production remains fail-closed when either the app or hosting platform identifies
 * the runtime as Production; no config drift may downgrade those controls.
 */
export function paidCheckoutEntryAllowed(userEmail: string | null | undefined) {
  if (paidPlanActivationAllowed()) return true;
  if (!paidUpgradeRequestsEnabled()) return false;

  if (!isProductionRuntime()) return true;
  if (!enabled("BILLING_RENEWAL_ENABLED") || !enabled("BILLING_OPERATIONS_READY")) return false;
  if (enabled("PAID_CHECKOUT_PUBLIC_ENABLED")) return true;

  const rehearsalEmail = String(process.env.BILLING_REHEARSAL_USER_EMAIL ?? "").trim().toLowerCase();
  const email = String(userEmail ?? "").trim().toLowerCase();
  return Boolean(rehearsalEmail && email && email === rehearsalEmail);
}

export function assertPaidPlanActivationAllowed(planCode: string) {
  if (!isPaidPlanCode(planCode)) return;
  if (!paidPlanActivationAllowed()) throw new Error("PAID_BILLING_NOT_CONFIGURED");
}
