import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../../../../lib/auth";
import { hasBillingCheckoutConsent } from "../../../../lib/billing-consent";
import { providerPaymentCreatedWithinBillingWindow } from "../../../../lib/billing-checkout-integrity";
import { activateVerifiedMoyasarPayment, getOwnedBillingPayment, markBillingPaymentState } from "../../../../lib/billing-ledger";
import { fetchMoyasarPayment, reverseMoyasarPayment } from "../../../../lib/moyasar";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";

function safeOrigin() {
  const configured = String(process.env.AUTH_ORIGIN ?? process.env.APP_URL ?? "").trim().replace(/\/$/, "");
  if (String(process.env.APP_ENV ?? "").toLowerCase() === "production") return "https://hee.sa";
  try {
    const url = new URL(configured || "http://localhost:3000");
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {}
  return "http://localhost:3000";
}

function back(code: string) {
  return NextResponse.redirect(new URL(`/dashboard/settings?billing=${encodeURIComponent(code)}`, safeOrigin()));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", safeOrigin()));

  const url = new URL(request.url);
  const billingId = String(url.searchParams.get("billing") ?? "").trim();
  const providerPaymentId = String(url.searchParams.get("id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(billingId) || !/^[A-Za-z0-9_-]{8,128}$/.test(providerPaymentId)) return back("invalid-callback");

  const billing = await getOwnedBillingPayment(user.id, billingId);
  if (!billing) return back("invalid-callback");

  try {
    const rate = await consumePublicWriteLimit({ scope: "billing-reconcile", businessId: billing.businessId, identity: user.id, limit: 30, windowSeconds: 600 });
    if (!rate.allowed) return back("rate-limited");
  } catch (error) {
    console.error("[billing-callback] rate_limit_failed", { billingId, error });
    return back("verification-unavailable");
  }

  try {
    const payment = await fetchMoyasarPayment(providerPaymentId);
    const metadataBilling = String(payment.metadata?.hee_billing_id ?? "");
    const metadataBusiness = String(payment.metadata?.hee_business_id ?? "");
    if (metadataBilling !== billing.id || metadataBusiness !== billing.businessId) return back("verification-failed");
    if (payment.amount !== billing.amount || payment.currency !== "SAR") return back("verification-failed");

    if (!billing.providerPaymentId && !providerPaymentCreatedWithinBillingWindow(billing.createdAt, payment)) {
      console.error("[billing-callback] stale_checkout_payment", { billingId, providerPaymentId: payment.id, providerStatus: payment.status });
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
      }
      return back("checkout-expired");
    }

    if (payment.status === "paid") {
      if (billing.kind !== "renewal" && !(await hasBillingCheckoutConsent(billing.id))) {
        console.error("[billing-callback] missing_checkout_consent", { billingId });
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
        return back("checkout-consent-missing");
      }
      const result = await activateVerifiedMoyasarPayment(billing.id, payment);
      if (result !== "activated" && result !== "already-paid") {
        // The provider settled real money but the locked HEE transaction could no longer
        // prove a safe entitlement target (for example deleted business/owner, unverified
        // owner, disabled plan or a terminal/stale billing state). Never keep the money
        // while denying the entitlement: reverse first, then persist the provider state.
        console.error("[billing-callback] settled_payment_not_activatable", { billingId, result });
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
        return back("payment-reversed");
      }
      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard/branding");
      return back("paid");
    }

    await markBillingPaymentState(billing.id, payment);
    return back(payment.status === "initiated" ? "pending" : "failed");
  } catch (error) {
    console.error("[billing-callback] verification_failed", {
      billingId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return back("verification-unavailable");
  }
}
