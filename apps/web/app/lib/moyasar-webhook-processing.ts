import "server-only";

import { db } from "./db";
import { hasBillingCheckoutConsent } from "./billing-consent";
import { providerPaymentCreatedWithinBillingWindow } from "./billing-checkout-integrity";
import {
  activateVerifiedMoyasarPayment,
  findBillingPaymentByProviderId,
  getBillingPaymentById,
  markBillingPaymentState,
} from "./billing-ledger";
import { fetchMoyasarPayment, reverseMoyasarPayment } from "./moyasar";

const CLAIM_STALE_MS = 5 * 60 * 1000;
const MAX_WEBHOOK_ATTEMPTS = 12;
const MAX_BACKOFF_MS = 15 * 60 * 1000;

type ClaimedEvent = {
  id: string;
  providerPaymentId: string;
  eventType: string;
  attempts: number;
};

function retryDelayMs(attempts: number) {
  return Math.min(MAX_BACKOFF_MS, 30_000 * (2 ** Math.max(0, attempts - 1)));
}

async function claimEvent(eventRowId: string): Promise<ClaimedEvent | null> {
  const staleBefore = new Date(Date.now() - CLAIM_STALE_MS);
  const rows = await db.$queryRaw<ClaimedEvent[]>`
    UPDATE "BillingWebhookEvent"
    SET "processingStartedAt" = CURRENT_TIMESTAMP,
        "nextAttemptAt" = NULL,
        "attempts" = "attempts" + 1,
        "lastError" = NULL
    WHERE "id" = ${eventRowId}
      AND "processedAt" IS NULL
      AND "provider" = 'moyasar'
      AND "providerPaymentId" IS NOT NULL
      AND "attempts" < ${MAX_WEBHOOK_ATTEMPTS}
      AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= CURRENT_TIMESTAMP)
      AND ("processingStartedAt" IS NULL OR "processingStartedAt" <= ${staleBefore})
    RETURNING "id", "providerPaymentId", "eventType", "attempts"
  `;
  return rows[0] ?? null;
}

async function completeEvent(eventRowId: string, billingPaymentId?: string | null, note?: string | null) {
  await db.$executeRaw`
    UPDATE "BillingWebhookEvent"
    SET "billingPaymentId" = COALESCE(${billingPaymentId ?? null}, "billingPaymentId"),
        "processedAt" = CURRENT_TIMESTAMP,
        "processingStartedAt" = NULL,
        "nextAttemptAt" = NULL,
        "lastError" = ${note ?? null}
    WHERE "id" = ${eventRowId} AND "processedAt" IS NULL
  `;
}

async function releaseForRetry(event: ClaimedEvent, code: string) {
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(event.attempts));
  await db.$executeRaw`
    UPDATE "BillingWebhookEvent"
    SET "processingStartedAt" = NULL,
        "nextAttemptAt" = ${nextAttemptAt},
        "lastError" = ${code.slice(0, 160)}
    WHERE "id" = ${event.id} AND "processedAt" IS NULL
  `;
}

export async function processMoyasarWebhookEvent(eventRowId: string) {
  const event = await claimEvent(eventRowId);
  if (!event) return "not-claimed" as const;

  try {
    const payment = await fetchMoyasarPayment(event.providerPaymentId);
    let billing = await findBillingPaymentByProviderId(payment.id);
    if (!billing) {
      const metadataBillingId = String(payment.metadata?.hee_billing_id ?? "");
      if (/^[0-9a-f-]{36}$/i.test(metadataBillingId)) billing = await getBillingPaymentById(metadataBillingId);
    }

    if (!billing) {
      await completeEvent(event.id, null, "unmatched_payment");
      return "unmatched" as const;
    }

    const metadataBusinessId = String(payment.metadata?.hee_business_id ?? "");
    const metadataBillingId = String(payment.metadata?.hee_billing_id ?? "");
    if (
      metadataBusinessId !== billing.businessId
      || metadataBillingId !== billing.id
      || payment.amount !== billing.amount
      || payment.currency !== billing.currency
    ) {
      console.error("[moyasar-webhook-worker] payment_mismatch", { eventId: event.id, billingId: billing.id });
      await completeEvent(event.id, billing.id, "payment_mismatch");
      return "mismatch" as const;
    }

    if (!billing.providerPaymentId && !providerPaymentCreatedWithinBillingWindow(billing.createdAt, payment)) {
      console.error("[moyasar-webhook-worker] stale_checkout_payment", {
        eventId: event.id,
        billingId: billing.id,
        providerPaymentId: payment.id,
        providerStatus: payment.status,
      });
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
      }
      await completeEvent(event.id, billing.id, "stale_checkout_payment");
      return "stale" as const;
    }

    if (payment.status === "paid") {
      if (billing.kind !== "renewal" && !(await hasBillingCheckoutConsent(billing.id))) {
        console.error("[moyasar-webhook-worker] missing_checkout_consent", { eventId: event.id, billingId: billing.id });
        const reversed = await reverseMoyasarPayment(payment.id);
        await markBillingPaymentState(billing.id, reversed);
        await completeEvent(event.id, billing.id, "missing_checkout_consent_reversed");
        return "reversed" as const;
      }

      const result = await activateVerifiedMoyasarPayment(billing.id, payment);
      if (result !== "activated" && result !== "already-paid") throw new Error(`ACTIVATION_${result}`);
    } else {
      await markBillingPaymentState(billing.id, payment);
    }

    await completeEvent(event.id, billing.id);
    return "processed" as const;
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    console.error("[moyasar-webhook-worker] processing_failed", { eventId: event.id, error: code });
    await releaseForRetry(event, code);
    return "retry" as const;
  }
}

export async function recoverPendingMoyasarWebhookEvents(limit = 50) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "BillingWebhookEvent"
    WHERE "provider" = 'moyasar'
      AND "processedAt" IS NULL
      AND "providerPaymentId" IS NOT NULL
      AND "attempts" < ${MAX_WEBHOOK_ATTEMPTS}
      AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= CURRENT_TIMESTAMP)
      AND ("processingStartedAt" IS NULL OR "processingStartedAt" <= CURRENT_TIMESTAMP - INTERVAL '5 minutes')
    ORDER BY "createdAt" ASC
    LIMIT ${boundedLimit}
  `;

  let processed = 0;
  for (const row of rows) {
    const result = await processMoyasarWebhookEvent(row.id);
    if (result !== "not-claimed") processed += 1;
  }
  return { checked: rows.length, processed };
}
