import { NextResponse } from "next/server";
import { getCurrentUserForApiWrite } from "../../../lib/auth";
import { recordBillingCheckoutConsent } from "../../../lib/billing-consent";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";

type Payload = { billingId?: unknown };

export async function POST(request: Request) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Payload;
  try {
    body = (await readBoundedJson(request, 4 * 1024)) as Payload;
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }

  const billingId = String(body.billingId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(billingId)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const consent = await recordBillingCheckoutConsent({ billingPaymentId: billingId, userId: user.id });
    if (!consent) return NextResponse.json({ ok: false, error: "CHECKOUT_NOT_ELIGIBLE" }, { status: 409 });
    return NextResponse.json({ ok: true, acceptedAt: consent.acceptedAt.toISOString() });
  } catch (error) {
    console.error("[billing-consent] write_failed", { billingId, error });
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
