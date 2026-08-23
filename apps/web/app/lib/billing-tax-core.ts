import { isProductionRuntime } from "./runtime-environment";

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
  return false;
}

export function receiptSnapshot(billingId: string, amount: number) {
  const status = billingTaxStatus();
  const legalName = value("BILLING_SELLER_LEGAL_NAME_AR");
  const address = value("BILLING_SELLER_ADDRESS_AR");

  if (isProductionRuntime() && (!legalName || !address || status !== "not_registered")) {
    throw new Error("BILLING_RECEIPT_TAX_CONFIGURATION_NOT_READY");
  }

  return {
    receiptNumber: `HEE-R-${billingId}`,
    sellerLegalName: legalName || "HEE Test Seller",
    sellerAddress: address || "Test Environment",
    taxStatus: "not_registered" as const,
    netAmount: amount,
    vatAmount: 0,
    issuedAt: new Date(),
  };
}
