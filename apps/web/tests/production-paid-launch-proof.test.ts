import assert from "node:assert/strict";
import test from "node:test";
import { assertPaidRehearsalProof, assertRehearsalCandidate, type RehearsalProofRow } from "../scripts/production-billing-launch-proof-core";

const releaseSha = "a".repeat(40);
const now = new Date("2026-08-22T12:00:00.000Z");
const rehearsalStartedAt = "2026-08-22T10:00:00.000Z";

function row(): RehearsalProofRow {
  return {
    billingId: "11111111-1111-4111-8111-111111111111",
    businessId: "22222222-2222-4222-8222-222222222222",
    planId: "33333333-3333-4333-8333-333333333333",
    subscriptionId: "44444444-4444-4444-8444-444444444444",
    providerPaymentId: "pay_live_12345678",
    kind: "initial",
    amount: 19900,
    currency: "SAR",
    paymentStatus: "paid",
    paidAt: "2026-08-22T10:06:00.000Z",
    paymentCreatedAt: "2026-08-22T10:02:00.000Z",
    receiptSellerLegalName: "مؤسسة اختبار",
    receiptSellerAddress: "جدة",
    receiptTaxStatus: "not_registered",
    receiptNetAmount: 19900,
    receiptVatAmount: 0,
    receiptIssuedAt: "2026-08-22T10:06:00.000Z",
    ownerEmail: "rehearsal@example.com",
    ownerEmailVerifiedAt: "2026-08-20T00:00:00.000Z",
    ownerDeletedAt: null,
    businessDeletedAt: null,
    businessPlanId: "33333333-3333-4333-8333-333333333333",
    planCode: "BUSINESS",
    planIsActive: true,
    subscriptionStatus: "active",
    subscriptionProvider: "moyasar",
    subscriptionProviderReference: "pay_live_12345678",
    subscriptionPaymentMethodId: "55555555-5555-4555-8555-555555555555",
    subscriptionAutoRenew: true,
    subscriptionEndsAt: "2026-09-22T10:06:00.000Z",
    paymentMethodProvider: "moyasar",
    paymentMethodStatus: "active",
    paymentMethodTokenLength: 96,
    consentAcceptedAt: "2026-08-22T10:03:00.000Z",
    consentTermsVersion: "terms-v1",
    consentPrivacyVersion: "privacy-v1",
    consentDisclosureVersion: "billing-v1",
    heartbeatAt: "2026-08-22T11:30:00.000Z",
    heartbeatReleaseSha: releaseSha,
    successfulWebhookEvents: 1,
    pendingWebhookEvents: 0,
  };
}

function provider() {
  return {
    id: "pay_live_12345678",
    status: "paid",
    amount: 19900,
    currency: "SAR",
    metadata: {
      hee_billing_id: "11111111-1111-4111-8111-111111111111",
      hee_business_id: "22222222-2222-4222-8222-222222222222",
    },
  };
}

test("rehearsal candidate must be one verified FREE business with no open billing", () => {
  const result = assertRehearsalCandidate([{
    userId: "u1",
    email: "Rehearsal@Example.com",
    emailVerifiedAt: now,
    userDeletedAt: null,
    businessId: "b1",
    businessDeletedAt: null,
    planCode: "FREE",
    activePaidSubscriptions: 0,
    openBillingPayments: 0,
  }], "rehearsal@example.com");
  assert.equal(result.businessId, "b1");
});

test("paid launch proof requires HEE ledger, entitlement, receipt, consent, webhook, worker and Moyasar to agree", () => {
  assert.equal(assertPaidRehearsalProof({ row: row(), provider: provider(), expectedEmail: "rehearsal@example.com", rehearsalStartedAt, releaseSha, now }), true);
});

test("paid launch proof rejects a payment created before the rehearsal deployment", () => {
  const changed = row();
  changed.paymentCreatedAt = "2026-08-22T09:59:59.000Z";
  assert.throws(() => assertPaidRehearsalProof({ row: changed, provider: provider(), expectedEmail: changed.ownerEmail, rehearsalStartedAt, releaseSha, now }), /predates/);
});

test("paid launch proof rejects missing webhook completion", () => {
  const changed = row();
  changed.successfulWebhookEvents = 0;
  assert.throws(() => assertPaidRehearsalProof({ row: changed, provider: provider(), expectedEmail: changed.ownerEmail, rehearsalStartedAt, releaseSha, now }), /webhook/);
});

test("paid launch proof rejects worker release mismatch", () => {
  const changed = row();
  changed.heartbeatReleaseSha = "b".repeat(40);
  assert.throws(() => assertPaidRehearsalProof({ row: changed, provider: provider(), expectedEmail: changed.ownerEmail, rehearsalStartedAt, releaseSha, now }), /different release SHA/);
});

test("paid launch proof rejects provider metadata mismatch", () => {
  const changedProvider = provider();
  changedProvider.metadata.hee_business_id = "wrong";
  assert.throws(() => assertPaidRehearsalProof({ row: row(), provider: changedProvider, expectedEmail: "rehearsal@example.com", rehearsalStartedAt, releaseSha, now }), /metadata/);
});
