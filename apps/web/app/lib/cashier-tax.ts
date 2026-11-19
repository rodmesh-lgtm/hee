import type { ZatcaBuyer } from "./cashier-zatca-document";

export const CASHIER_VAT_RATE = 15;
export const CASHIER_OUTPUT_VAT_ACCOUNT = "2215";

export type CashierTaxProfile = {
  sellerName: string;
  sellerAddress: string;
  vatNumber: string;
  enabled: boolean;
};

export type CashierTaxDocument = Omit<CashierTaxProfile, "enabled"> & {
  number: number;
  issuedAt: string;
  gross: number;
  vat: number;
  originalNumber: number | null;
  zatca?: { qr: string; status: "pending" | "reported" | "review"; buyer?: ZatcaBuyer | null } | null;
};

export function cashierVatFromGross(gross: number) {
  if (!Number.isSafeInteger(gross) || gross < 0 || gross > 2_147_483_647) {
    throw new RangeError("Invalid VAT-inclusive amount");
  }
  return Math.floor((gross * CASHIER_VAT_RATE + 57) / 115);
}

export function cashierTaxNumber(number: number) {
  return `VAT-${String(number).padStart(6, "0")}`;
}

export function normalizeCashierVatNumber(value: string) {
  return value.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0)));
}

export function cashierTaxQrPayload(document: CashierTaxDocument) {
  const encode = new TextEncoder();
  const fields = [
    document.sellerName,
    document.vatNumber,
    new Date(document.issuedAt).toISOString(),
    (document.gross / 100).toFixed(2),
    (document.vat / 100).toFixed(2),
  ];
  const bytes = fields.flatMap((value, index) => {
    const utf8 = encode.encode(value);
    if (utf8.length > 255) throw new RangeError("Invalid ZATCA TLV field length");
    return [index + 1, utf8.length, ...utf8];
  });
  return btoa(String.fromCharCode(...bytes));
}

export function cashierTaxAwaitingClearance(document?: CashierTaxDocument | null) {
  return Boolean(document?.zatca?.buyer && document.zatca.status !== "reported");
}
