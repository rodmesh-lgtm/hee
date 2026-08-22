export type RehearsalCandidate = {
  userId: string;
  email: string;
  emailVerifiedAt: Date | string | null;
  userDeletedAt: Date | string | null;
  businessId: string;
  businessDeletedAt: Date | string | null;
  planCode: string | null;
  activePaidSubscriptions: number;
  openBillingPayments: number;
};

export type RehearsalProofRow = {
  billingId: string;
  businessId: string;
  planId: string;
  subscriptionId: string | null;
  providerPaymentId: string | null;
  kind: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paidAt: Date | string | null;
  paymentCreatedAt: Date | string;
  receiptSellerLegalName: string | null;
  receiptSellerAddress: string | null;
  receiptTaxStatus: string | null;
  receiptNetAmount: number | null;
  receiptVatAmount: number | null;
  receiptIssuedAt: Date | string | null;
  ownerEmail: string;
  ownerEmailVerifiedAt: Date | string | null;
  ownerDeletedAt: Date | string | null;
  businessDeletedAt: Date | string | null;
  businessPlanId: string | null;
  planCode: string;
  planIsActive: boolean;
  subscriptionStatus: string | null;
  subscriptionProvider: string | null;
  subscriptionProviderReference: string | null;
  subscriptionPaymentMethodId: string | null;
  subscriptionAutoRenew: boolean | null;
  subscriptionEndsAt: Date | string | null;
  paymentMethodProvider: string | null;
  paymentMethodStatus: string | null;
  paymentMethodTokenLength: number | null;
  consentAcceptedAt: Date | string | null;
  consentTermsVersion: string | null;
  consentPrivacyVersion: string | null;
  consentDisclosureVersion: string | null;
  heartbeatAt: Date | string | null;
  heartbeatReleaseSha: string | null;
  successfulWebhookEvents: number;
  pendingWebhookEvents: number;
};

export type ProviderPaymentProof = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
};

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function time(value: Date | string | null | undefined) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function requireNonEmpty(value: string | null | undefined, name: string) {
  if (!String(value ?? "").trim()) throw new Error(`${name} is missing`);
}

export function assertRehearsalCandidate(rows: RehearsalCandidate[], expectedEmail: string) {
  if (rows.length !== 1) throw new Error("Rehearsal account must resolve to exactly one eligible non-deleted business");
  const row = rows[0];
  if (normalizedEmail(row.email) !== normalizedEmail(expectedEmail)) throw new Error("Rehearsal account email mismatch");
  if (!row.emailVerifiedAt || row.userDeletedAt || row.businessDeletedAt) throw new Error("Rehearsal account must be verified and active");
  if (String(row.planCode ?? "FREE").toUpperCase() !== "FREE") throw new Error("Rehearsal business must begin on the FREE plan");
  if (Number(row.activePaidSubscriptions) !== 0) throw new Error("Rehearsal business already has a live paid subscription");
  if (Number(row.openBillingPayments) !== 0) throw new Error("Rehearsal business has an open billing payment");
  return row;
}

export function assertPaidRehearsalProof(input: {
  row: RehearsalProofRow;
  provider: ProviderPaymentProof;
  expectedEmail: string;
  rehearsalStartedAt: string;
  releaseSha: string;
  now?: Date;
}) {
  const { row, provider } = input;
  const now = input.now ?? new Date();
  const releaseSha = input.releaseSha.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error("Release SHA is invalid");
  if (normalizedEmail(row.ownerEmail) !== normalizedEmail(input.expectedEmail)) throw new Error("Paid rehearsal belongs to a different owner");
  if (!row.ownerEmailVerifiedAt || row.ownerDeletedAt || row.businessDeletedAt) throw new Error("Paid rehearsal owner/business is no longer eligible");
  if (row.kind !== "initial") throw new Error("Launch rehearsal must be an initial paid checkout, not renewal or upgrade");
  if (row.paymentStatus !== "paid" || !row.paidAt) throw new Error("HEE billing ledger does not show a settled paid rehearsal");
  if (row.currency !== "SAR" || !Number.isInteger(row.amount) || row.amount <= 0) throw new Error("HEE rehearsal amount/currency is invalid");
  if (time(row.paymentCreatedAt) < time(input.rehearsalStartedAt)) throw new Error("Billing intent predates the successful rehearsal deployment");
  if (time(row.paidAt) < time(row.paymentCreatedAt)) throw new Error("Paid timestamp predates the billing intent");

  requireNonEmpty(row.providerPaymentId, "Provider payment id");
  if (!row.subscriptionId || row.subscriptionStatus !== "active") throw new Error("Paid rehearsal did not create an active subscription");
  if (row.subscriptionProvider !== "moyasar" || row.subscriptionProviderReference !== row.providerPaymentId) throw new Error("Subscription is not bound to the settled Moyasar payment");
  if (row.businessPlanId !== row.planId) throw new Error("Business entitlement plan does not match the paid plan");
  if (!new Set(["BUSINESS", "PRO"]).has(row.planCode) || !row.planIsActive) throw new Error("Paid rehearsal target plan is not an active public paid plan");
  if (!row.subscriptionEndsAt || time(row.subscriptionEndsAt) <= now.getTime()) throw new Error("Paid rehearsal subscription has no future paid-through date");

  if (!row.subscriptionAutoRenew || !row.subscriptionPaymentMethodId) throw new Error("Paid rehearsal did not establish auto-renew with a stored payment method");
  if (row.paymentMethodProvider !== "moyasar" || row.paymentMethodStatus !== "active" || Number(row.paymentMethodTokenLength ?? 0) < 16) {
    throw new Error("Stored Moyasar payment method is missing or inactive");
  }

  requireNonEmpty(row.receiptSellerLegalName, "Receipt seller legal name");
  requireNonEmpty(row.receiptSellerAddress, "Receipt seller address");
  if (row.receiptTaxStatus !== "not_registered") throw new Error("Rehearsal receipt tax posture is not the launch-approved posture");
  if (row.receiptNetAmount !== row.amount || row.receiptVatAmount !== 0 || !row.receiptIssuedAt) throw new Error("Rehearsal receipt snapshot is incomplete or inconsistent");

  if (!row.consentAcceptedAt) throw new Error("Paid rehearsal has no persisted checkout consent");
  requireNonEmpty(row.consentTermsVersion, "Consent terms version");
  requireNonEmpty(row.consentPrivacyVersion, "Consent privacy version");
  requireNonEmpty(row.consentDisclosureVersion, "Consent disclosure version");

  if (Number(row.successfulWebhookEvents) < 1) throw new Error("No successfully processed Moyasar webhook is bound to the rehearsal payment");
  if (Number(row.pendingWebhookEvents) !== 0) throw new Error("Rehearsal payment still has pending Moyasar webhook work");

  if (!row.heartbeatAt || now.getTime() - time(row.heartbeatAt) > 90 * 60 * 1000) throw new Error("Billing operations heartbeat is missing or stale");
  if (String(row.heartbeatReleaseSha ?? "").trim().toLowerCase() !== releaseSha) throw new Error("Billing worker heartbeat is from a different release SHA");

  if (provider.id !== row.providerPaymentId || provider.status !== "paid") throw new Error("Moyasar does not confirm the same payment as paid");
  if (provider.amount !== row.amount || provider.currency !== row.currency) throw new Error("Moyasar amount/currency differs from the HEE ledger");
  if (String(provider.metadata?.hee_billing_id ?? "") !== row.billingId || String(provider.metadata?.hee_business_id ?? "") !== row.businessId) {
    throw new Error("Moyasar metadata is not bound to the HEE rehearsal billing/business ids");
  }

  return true;
}
