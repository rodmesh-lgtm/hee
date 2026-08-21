import { NextResponse } from "next/server";
import { getCurrentUserForWrites } from "../../../../lib/auth";
import { activateVerifiedMoyasarPayment, getOwnedBillingPayment, markBillingPaymentState } from "../../../../lib/billing-ledger";
import { fetchMoyasarPayment } from "../../../../lib/moyasar";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";

type Payload = { billingId?: unknown; paymentId?: unknown };

export async function POST(request: Request) {
  const user = await getCurrentUserForWrites();
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
    // The browser only tells us which provider ID was created. Canonical amount,
    // currency, status and metadata are always re-read with the secret key.
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

    if (payment.status === "paid") {
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
