import "server-only";

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

/**
 * Controls whether a customer may create a new paid checkout intent.
 *
 * Production has three deliberately separate states:
 * 1. billing provider/worker prerequisites are configured;
 * 2. one verified rehearsal account may exercise the live path while public checkout is closed;
 * 3. PAID_CHECKOUT_PUBLIC_ENABLED=true opens new paid checkout intents to all eligible customers.
 *
 * Existing provider-started intents remain reconcilable even if the public switch is later
 * closed; this function is intentionally used only at the *entry* boundary.
 */
export function paidCheckoutEntryAllowed(userEmail: string | null | undefined) {
  if (paidPlanActivationAllowed()) return true;
  if (!paidUpgradeRequestsEnabled()) return false;

  const production = String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";
  if (!production) return true;
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
