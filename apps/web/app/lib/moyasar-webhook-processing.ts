import "server-only";

import { db } from "./db";
import { hasBillingCheckoutConsent } from "./billing-consent";
import { providerPaymentCreatedWithinBillingWindow } from "./billing-checkout-integrity";
import {
  activateVerifiedMoyasarPayment,
  findBillingPaymentByProviderId,
  getBillingPaymentById,
  markBillingPaymentState,
  type BillingPaymentRow,
} from "./billing-ledger";
import { fetchMoyasarPayment, reverseMoyasarPayment, type MoyasarPayment } from "./moyasar";

const CLAIM_STALE_MS = 5 * 60 * 1000;
const MAX_WEBHOOK_ATTEMPTS = 12;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const OPEN_CHECKOUT_RECONCILE_AGE_MS = 2 * 60 * 1000;
const OPEN_AUTHORIZATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

function paymentIdentityMatchesBilling(billing: BillingPaymentRow, payment: MoyasarPayment) {
  return String(payment.metadata?.hee_business_id ?? "") === billing.businessId
    && String(payment.metadata?.hee_billing_id ?? "") === billing.id;
}

function paymentValueMatchesBilling(billing: BillingPaymentRow, payment: MoyasarPayment) {
  return payment.amount === billing.amount && payment.currency === billing.currency;
}

async function reverseAndRecord(billing: BillingPaymentRow, payment: MoyasarPayment) {
  const reversed = await reverseMoyasarPayment(payment.id);
  await markBillingPaymentState(billing.id, reversed);
  return reversed;
}

async function reconcileVerifiedCheckoutPayment(billing: BillingPaymentRow, payment: MoyasarPayment) {
  if (billing.kind === "renewal") return "renewal-owned-by-renewal-worker" as const;
  if (!paymentIdentityMatchesBilling(billing, payment)) return "identity-mismatch" as const;
  if (!paymentValueMatchesBilling(billing, payment)) {
    if (["paid", "captured", "authorized"].includes(payment.status)) {
      await reverseAndRecord(billing, payment);
      return "amount-currency-mismatch-reversed" as const;
    }
    return "amount-currency-mismatch" as const;
  }

  if (payment.status === "paid") {
    if (!(await hasBillingCheckoutConsent(billing.id))) {
      await reverseAndRecord(billing, payment);
      return "missing-consent-reversed" as const;
    }
    const result = await activateVerifiedMoyasarPayment(billing.id, payment);
    if (result === "activated" || result === "already-paid") return result;
    await reverseAndRecord(billing, payment);
    return `activation-${result}-reversed` as const;
  }

  if (payment.status === "authorized" && Date.now() - billing.createdAt.getTime() >= OPEN_AUTHORIZATION_MAX_AGE_MS) {
    await reverseAndRecord(billing, payment);
    return "stale-authorization-reversed" as const;
  }

  await markBillingPaymentState(billing.id, payment);
  return "state-recorded" as const;
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
      // A settled/authorized provider payment must never be acknowledged as terminally
      // processed while HEE has no ledger row for it. The ledger may be temporarily
      // unavailable because the provider webhook raced the checkout-created callback.
      // Keep the durable inbox event recoverable; if the row never appears, the normal
      // retry budget exhausts and billing-state-audit turns it into an operator-visible
      // launch/heartbeat blocker instead of silently losing customer money.
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        console.error("[moyasar-webhook-worker] settled_orphan_payment", {
          eventId: event.id,
          providerPaymentId: payment.id,
          providerStatus: payment.status,
        });
        await releaseForRetry(event, "settled_orphan_payment");
        return "retry" as const;
      }
      await completeEvent(event.id, null, "unmatched_payment");
      return "unmatched" as const;
    }

    if (!paymentIdentityMatchesBilling(billing, payment)) {
      console.error("[moyasar-webhook-worker] payment_identity_mismatch", { eventId: event.id, billingId: billing.id, providerStatus: payment.status });
      // Do not mutate or reverse money when the provider identity metadata conflicts
      // with HEE's ledger: the intended owner is not trustworthy enough to choose a
      // financial action automatically. Settled/authorized funds must also never be
      // acknowledged as terminally processed. Keep the durable inbox event retriable;
      // exhausted retries are surfaced by billing-state-audit for operator resolution.
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        await releaseForRetry(event, "payment_identity_mismatch");
        return "retry" as const;
      }
      await completeEvent(event.id, billing.id, "payment_identity_mismatch");
      return "mismatch" as const;
    }

    if (!paymentValueMatchesBilling(billing, payment)) {
      console.error("[moyasar-webhook-worker] payment_amount_currency_mismatch", { eventId: event.id, billingId: billing.id, providerStatus: payment.status });
      if (["paid", "captured", "authorized"].includes(payment.status)) {
        await reverseAndRecord(billing, payment);
        await completeEvent(event.id, billing.id, "payment_amount_currency_mismatch_reversed");
        return "reversed" as const;
      }
      await completeEvent(event.id, billing.id, "payment_amount_currency_mismatch");
      return "mismatch" as const;
    }

    if (!billing.providerPaymentId && !providerPaymentCreatedWithinBillingWindow(billing.createdAt, payment)) {
      console.error("[moyasar-webhook-worker] stale_checkout_payment", { eventId: event.id, billingId: billing.id, providerPaymentId: payment.id, providerStatus: payment.status });
      if (["paid", "captured", "authorized"].includes(payment.status)) await reverseAndRecord(billing, payment);
      await completeEvent(event.id, billing.id, "stale_checkout_payment");
      return "stale" as const;
    }

    if (billing.kind !== "renewal") {
      const result = await reconcileVerifiedCheckoutPayment(billing, payment);
      if (result === "identity-mismatch" || result === "amount-currency-mismatch") {
        await completeEvent(event.id, billing.id, result.replaceAll("-", "_"));
        return "mismatch" as const;
      }
      await completeEvent(event.id, billing.id, result.includes("reversed") ? result : null);
      return result.includes("reversed") ? "reversed" as const : "processed" as const;
    }

    if (payment.status === "paid") {
      const result = await activateVerifiedMoyasarPayment(billing.id, payment);
      if (result !== "activated" && result !== "already-paid") {
        console.error("[moyasar-webhook-worker] settled_payment_not_activatable", { eventId: event.id, billingId: billing.id, result });
        await reverseAndRecord(billing, payment);
        await completeEvent(event.id, billing.id, `activation_${result}_reversed`);
        return "reversed" as const;
      }
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
  let retries = 0;
  for (const row of rows) {
    const result = await processMoyasarWebhookEvent(row.id);
    if (result !== "not-claimed") processed += 1;
    if (result === "retry") retries += 1;
  }
  return { checked: rows.length, processed, retries, errors: retries };
}

export async function recoverOpenMoyasarCheckoutPayments(limit = 50) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const olderThan = new Date(Date.now() - OPEN_CHECKOUT_RECONCILE_AGE_MS);
  const rows = await db.$queryRaw<Array<{ id: string; providerPaymentId: string }>>`
    SELECT "id", "providerPaymentId"
    FROM "BillingPayment"
    WHERE "provider" = 'moyasar'
      AND "kind" IN ('initial','upgrade')
      AND "status" IN ('initiated','authorized')
      AND "providerPaymentId" IS NOT NULL
      AND "updatedAt" <= ${olderThan}
    ORDER BY "updatedAt" ASC
    LIMIT ${boundedLimit}
  `;

  let reconciled = 0;
  let errors = 0;
  for (const row of rows) {
    try {
      const billing = await getBillingPaymentById(row.id);
      if (!billing || !["initiated", "authorized"].includes(billing.status) || billing.providerPaymentId !== row.providerPaymentId) continue;
      const payment = await fetchMoyasarPayment(row.providerPaymentId);
      const result = await reconcileVerifiedCheckoutPayment(billing, payment);
      if (result === "identity-mismatch" || result === "amount-currency-mismatch") {
        console.error("[moyasar-checkout-recovery] payment_mismatch", { billingId: billing.id, result });
        errors += 1;
        continue;
      }
      reconciled += 1;
    } catch (error) {
      errors += 1;
      console.error("[moyasar-checkout-recovery] reconciliation_failed", { billingId: row.id, error: error instanceof Error ? error.message : "unknown" });
    }
  }
  return { checked: rows.length, reconciled, errors };
}