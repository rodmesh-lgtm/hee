import "server-only";

export type BillingTaxStatus = "not_registered" | "vat_registered";

function value(name: string) {
  return String(process.env[name] ?? "").trim();
}

export function billingTaxStatus(): BillingTaxStatus | null {
  const status = value("BILLING_TAX_STATUS").toLowerCase();
  if (status === "not_registered" || status === "vat_registered") return status;
  return null;
}

export function billingSellerIdentityConfigured() {
  return Boolean(value("BILLING_SELLER_LEGAL_NAME_AR") && value("BILLING_SELLER_ADDRESS_AR"));
}

export function paidBillingTaxReady() {
  if (!billingSellerIdentityConfigured()) return false;
  const status = billingTaxStatus();
  if (status === "not_registered") return true;

  // HEE must not label a plain application receipt as a Saudi tax invoice. A
  // VAT-registered seller needs the ZATCA-compliant e-invoicing path, including the
  // applicable Phase 1/Phase 2 requirements. That integration is not implemented in
  // this billing round, so paid checkout remains fail-closed for vat_registered.
  return false;
}
