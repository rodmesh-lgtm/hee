import { NextResponse } from "next/server";
import { getCurrentUserForApiWrite } from "../../../../lib/auth";
import { hasBillingCheckoutConsent } from "../../../../lib/billing-consent";
import { providerPaymentCreatedWithinBillingWindow } from "../../../../lib/billing-checkout-integrity";
import { activateVerifiedMoyasarPayment, getOwnedBillingPayment, markBillingPaymentState } from "../../../../lib/billing-ledger";
import { fetchMoyasarPayment, reverseMoyasarPayment } from "../../../../lib/moyasar";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";

type Payload = { billingId?: unknown; paymentId?: unknown };

export async function POST(request: Request) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Payload;
  try {
    body = (await readBoundedJson(request, 8 * 1024)) as Payload;
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }

  const billingId = String(body.billingId ?? "").trim();
  const paymentId = String(body.paymentId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(billingId) || !/^[A-Za-z0-9_-]{8,128}$/.test(paymentId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const billing = await getOwnedBillingPayment(user.id, billingId);
  if (!billing) return NextResponse.json({ ok: false }, { status: 404 });
  if (billing.providerPaymentId && billing.providerPaymentId !== paymentId) {
    console.error("[billing-created] duplicate_provider_payment", { billingId });
    return NextResponse.json({ ok: false }, { status: 409 });
  }

  try {
    const rate = await consumePublicWriteLimit({ scope: "billing-reconcile", businessId: billing.businessId, identity: user.id, limit: 30, windowSeconds: 600 });
    if (!rate.allowed) return NextResponse.json({ ok: false }, { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } });
  } catch (error) {
    console.error("[billing-created] rate_limit_failed", { billingId, error });
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }

  try {
    const payment = await fetchMoyasarPayment(paymentId);
    if (
      payment.amount !== billing.amount
      || payment.currency !== billing.currency
      || String(payment.metadata?.hee_billing_id ?? "") !== billing.id
      || String(payment.metadata?.hee_business_id ?? "") !== billing.businessId
    ) {
      console.error("[billing-created] payment_mismatch", { billingId });
      return NextResponse.json({ ok: false }, { status: 409 });
    }

    if (!billing.providerPaymentId && !providerPaymentCreatedWithinBillingWindow(billing.createdAt, payment)) {
      console.error("[billing-created] stale_checkout_payment", { billingId, providerPaymentId: payment.id, providerStatus: payment.status });
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
      }
      return NextResponse.json({ ok: false, error: "CHECKOUT_EXPIRED" }, { status: 409 });
    }

    if (payment.status === "paid") {
      if (billing.kind !== "renewal" && !(await hasBillingCheckoutConsent(billing.id))) {
        console.error("[billing-created] missing_checkout_consent", { billingId });
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
        return NextResponse.json({ ok: false, error: "CHECKOUT_CONSENT_MISSING" }, { status: 409 });
      }
      const result = await activateVerifiedMoyasarPayment(billing.id, payment);
      if (result !== "activated" && result !== "already-paid") {
        console.error("[billing-created] activation_rejected", { billingId, result });
        return NextResponse.json({ ok: false }, { status: 409 });
      }
    } else {
      await markBillingPaymentState(billing.id, payment);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[billing-created] reconciliation_failed", {
      billingId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
