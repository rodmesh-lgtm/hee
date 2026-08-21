import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "../../../../lib/db";
import { activateVerifiedMoyasarPayment, findBillingPaymentByProviderId, markBillingPaymentState } from "../../../../lib/billing-ledger";
import { fetchMoyasarPayment, verifyMoyasarWebhookSecret, type MoyasarWebhook } from "../../../../lib/moyasar";
import { readBoundedText } from "../../../../lib/request-body";

const MAX_WEBHOOK_BYTES = 128 * 1024;

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

async function claimEvent(event: MoyasarWebhook) {
  const id = randomUUID();
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "BillingWebhookEvent" ("id", "provider", "providerEventId", "eventType", "createdAt")
    VALUES (${id}, 'moyasar', ${event.id}, ${event.type}, CURRENT_TIMESTAMP)
    ON CONFLICT ("provider", "providerEventId") DO NOTHING
    RETURNING "id"
  `;
  return rows[0]?.id ?? null;
}

async function completeEvent(eventRowId: string, billingPaymentId?: string | null) {
  await db.$executeRaw`
    UPDATE "BillingWebhookEvent"
    SET "billingPaymentId" = ${billingPaymentId ?? null}, "processedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${eventRowId}
  `;
}

export async function POST(request: Request) {
  if (!String(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  let body: string;
  try {
    body = await readBoundedText(request, MAX_WEBHOOK_BYTES);
  } catch {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let event: MoyasarWebhook;
  try {
    event = JSON.parse(body) as MoyasarWebhook;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!validText(event.id, 128) || !validText(event.type, 80) || !verifyMoyasarWebhookSecret(event.secret_token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const production = String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";
  if ((production && event.live !== true) || (!production && event.live === true)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventRowId = await claimEvent(event);
  if (!eventRowId) return NextResponse.json({ ok: true, duplicate: true });

  const providerPaymentId = String(event.data?.id ?? "").trim();
  if (!providerPaymentId || !event.type.startsWith("payment_")) {
    await completeEvent(eventRowId);
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    // Never grant entitlement from webhook JSON alone. Re-fetch the payment with the
    // server-side secret key and independently verify the provider's canonical state.
    const payment = await fetchMoyasarPayment(providerPaymentId);
    let billing = await findBillingPaymentByProviderId(payment.id);
    if (!billing) {
      const metadataBillingId = String(payment.metadata?.hee_billing_id ?? "");
      if (/^[0-9a-f-]{36}$/i.test(metadataBillingId)) {
        const rows = await db.$queryRaw<Awaited<ReturnType<typeof findBillingPaymentByProviderId>>[]>(
          `SELECT * FROM "BillingPayment" WHERE "id" = $1 LIMIT 1` as never,
          metadataBillingId as never,
        ).catch(() => []);
        billing = rows[0] ?? null;
      }
    }

    if (!billing) {
      await completeEvent(eventRowId);
      return NextResponse.json({ ok: true, unmatched: true });
    }

    const metadataBusinessId = String(payment.metadata?.hee_business_id ?? "");
    const metadataBillingId = String(payment.metadata?.hee_billing_id ?? "");
    if (metadataBusinessId !== billing.businessId || metadataBillingId !== billing.id || payment.amount !== billing.amount || payment.currency !== billing.currency) {
      console.error("[moyasar-webhook] payment_mismatch", { eventId: event.id, billingId: billing.id });
      await completeEvent(eventRowId, billing.id);
      return NextResponse.json({ ok: false }, { status: 409 });
    }

    if (payment.status === "paid") {
      const result = await activateVerifiedMoyasarPayment(billing.id, payment);
      if (result !== "activated" && result !== "already-paid") throw new Error(`ACTIVATION_${result}`);
    } else {
      await markBillingPaymentState(billing.id, payment);
    }

    await completeEvent(eventRowId, billing.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Keep processedAt null and return non-2xx so Moyasar retries delivery.
    console.error("[moyasar-webhook] processing_failed", {
      eventId: event.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
