import { createPrivateKey, randomUUID, X509Certificate } from "node:crypto";
import type { Invoice, Result } from "zatca-sdk";
import { z } from "zod";
import { CASHIER_VAT_RATE, cashierTaxNumber, cashierVatFromGross, type CashierTaxProfile } from "./cashier-tax";

const initialHash = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";
const text = z.string().trim().min(2).max(100).regex(/^[^\u0000-\u001f\u007f]+$/u);
export const zatcaAddress = z.object({
  street: text, district: text, city: text,
  building: z.string().regex(/^\d{4}$/), additionalNumber: z.string().regex(/^\d{4}$/),
  postalCode: z.string().regex(/^\d{5}$/),
  crNumber: z.string().regex(/^\d{10}$/),
});
export const zatcaBuyer = zatcaAddress.omit({ crNumber: true }).extend({
  name: text, vatNumber: z.string().regex(/^3[0-9]{13}3$/), region: text,
});
export type ZatcaBuyer = z.infer<typeof zatcaBuyer>;
export type ZatcaScope = "simplified" | "standard";
export type ZatcaAddress = z.infer<typeof zatcaAddress>;
export type ZatcaCredentials = { privateKey: string; binarySecurityToken: string; secret: string };
export type ZatcaLine = { name: string; quantity: number; gross: number; unit?: string };

const sar = (amount: number) => amount / 100;
const units: Record<string, string> = { piece: "PCE", meter: "MTR", square_meter: "MTK" };

export async function zatcaSigningCertificate(credentials: ZatcaCredentials, at = new Date()) {
  const { normalizeCertificate } = await import("zatca-sdk");
  const certificatePem = unwrap(normalizeCertificate(credentials.binarySecurityToken)).pem;
  const certificate = new X509Certificate(certificatePem);
  const privateKey = createPrivateKey(credentials.privateKey);
  const expiresAt = new Date(certificate.validTo);
  if (privateKey.asymmetricKeyDetails?.namedCurve !== "secp256k1" || !certificate.checkPrivateKey(privateKey) ||
      at < new Date(certificate.validFrom) || at >= expiresAt) {
    throw new Error("ZATCA_SIGNING_CERTIFICATE_INVALID");
  }
  return { certificatePem, expiresAt };
}

export function buildZatcaInvoice(input: {
  profile: Omit<CashierTaxProfile, "enabled">;
  address: ZatcaAddress;
  number: number;
  counter: number;
  previousHash: string | null;
  issuedAt: Date;
  gross: number;
  vat: number;
  lines: ZatcaLine[];
  method?: string;
  buyer?: ZatcaBuyer;
  supplyDate?: string;
  correction?: { number: number; reason: string; debit?: boolean };
}): Invoice {
  const { address: { crNumber, ...address }, profile, correction, buyer } = input;
  const issuedAt = input.issuedAt.toISOString();
  const net = input.gross - input.vat;
  const grossSum = input.lines.reduce((sum, line) => sum + line.gross, 0);
  if (grossSum !== input.gross || net < 0 || input.gross <= 0 || Math.abs(cashierVatFromGross(input.gross) - input.vat) > 1) {
    throw new Error("ZATCA_TOTAL_MISMATCH");
  }

  let cumulativeGross = 0;
  const allocation = input.lines.map(line => {
    if (!Number.isSafeInteger(line.gross) || line.gross < 0) throw new Error("ZATCA_LINE_AMOUNT_INVALID");
    const previous = cashierVatFromGross(cumulativeGross);
    cumulativeGross += line.gross;
    return cashierVatFromGross(cumulativeGross) - previous;
  });
  const adjustment = input.vat - allocation.reduce((sum, amount) => sum + amount, 0);
  if (adjustment) {
    const adjustable = allocation.findIndex((amount, index) => adjustment > 0 ? amount < input.lines[index].gross : amount > 0);
    if (adjustable < 0) throw new Error("ZATCA_VAT_ROUNDING_INVALID");
    allocation[adjustable] += adjustment;
  }
  const invoiceLines = input.lines.map((line, index) => {
    const vat = allocation[index];
    const lineNet = line.gross - vat;
    if (lineNet < 0 || line.quantity <= 0 || !Number.isFinite(line.quantity)) throw new Error("ZATCA_LINE_AMOUNT_INVALID");
    return {
      id: String(index + 1), name: line.name, quantity: line.quantity, unitCode: units[line.unit ?? "piece"] ?? "PCE",
      lineTotal: sar(lineNet), vatAmount: sar(vat), vatCategory: "S" as const,
      vatPercent: CASHIER_VAT_RATE, unitPrice: sar(lineNet) / line.quantity,
    };
  });

  return {
    uuid: randomUUID(), id: cashierTaxNumber(input.number), issueDate: issuedAt.slice(0, 10),
    issueTime: issuedAt.slice(11, 19), invoiceTypeCode: correction ? (correction.debit ? "383" : "381") : "388",
    invoiceSubType: buyer ? "0100000" : "0200000", documentCurrency: "SAR", taxCurrency: "SAR",
    invoiceCounterValue: input.counter, previousInvoiceHash: input.previousHash ?? initialHash,
    paymentMeansCode: input.method === "cash" ? "10" : input.method === "card" ? "48" : input.method === "transfer" ? "30" : "1",
    seller: { registrationName: profile.sellerName, vatNumber: profile.vatNumber, identification: { schemeId: "CRN", value: crNumber },
      address: { street: address.street, city: address.city, buildingNumber: address.building, citySubdivision: address.district,
        postalCode: address.postalCode, plotIdentification: address.additionalNumber, country: "SA" } },
    buyer: buyer ? { registrationName: buyer.name, vatNumber: buyer.vatNumber,
      address: { street: buyer.street, buildingNumber: buyer.building, plotIdentification: buyer.additionalNumber,
        citySubdivision: buyer.district, city: buyer.city, postalCode: buyer.postalCode, countrySubentity: buyer.region, country: "SA" } } : undefined,
    actualDeliveryDate: buyer && !correction ? input.supplyDate : undefined,
    lineExtensionAmount: sar(net), taxExclusiveAmount: sar(net), taxInclusiveAmount: sar(input.gross),
    payableAmount: sar(input.gross), taxTotal: sar(input.vat),
    taxSubtotals: [{ taxableAmount: sar(net), taxAmount: sar(input.vat), taxPercent: CASHIER_VAT_RATE, taxCategory: "S" }],
    lines: invoiceLines,
    billingReference: correction ? { invoiceId: cashierTaxNumber(correction.number) } : undefined,
    creditDebitReason: correction?.reason,
  };
}

function unwrap<T>(result: Result<T>): T {
  if (!result.success) throw result.error;
  return result.data;
}

async function assembleZatcaXml(document: Invoice) {
  const { buildInvoiceXml } = await import("zatca-sdk");
  let index = 0;
  // BT-146 allows extra decimals. Keep the exact per-unit price before hashing.
  const xml = unwrap(buildInvoiceXml(document)).replace(
    /(<cbc:PriceAmount currencyID="SAR">)[0-9.]+(<\/cbc:PriceAmount>)/g,
    (_match, start: string, end: string) => start + document.lines[index++].unitPrice.toFixed(10) + end,
  );
  if (index !== document.lines.length) throw new Error("ZATCA_PRICE_COUNT_MISMATCH");
  return xml;
}

export async function prepareStandardZatcaInvoice(document: Invoice) {
  if (document.invoiceSubType !== "0100000" || !document.buyer) throw new Error("ZATCA_STANDARD_BUYER_REQUIRED");
  const { computeInvoiceHashFromXml } = await import("zatca-sdk");
  const xml = (await assembleZatcaXml(document))
    .replace(/  <cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>\n/u, "")
    .replace(/  <cac:Signature>[\s\S]*?<\/cac:Signature>\n/u, "");
  return { uuid: document.uuid, hash: unwrap(computeInvoiceHashFromXml(xml)), xml, qr: "" };
}

export async function signZatcaInvoice(document: Invoice, credentials: ZatcaCredentials) {
  const { computeInvoiceHashFromXml, createUBLExtensions, formatQrTimestamp, generateTLVString,
    insertUBLExtensions, replaceQrPlaceholder, verifyInvoiceSignature } = await import("zatca-sdk");
  const timestamp = formatQrTimestamp(document.issueDate, document.issueTime);
  const { certificatePem } = await zatcaSigningCertificate(credentials);
  const unsigned = await assembleZatcaXml(document);
  const hash = unwrap(computeInvoiceHashFromXml(unsigned));
  const signed = unwrap(createUBLExtensions(hash, { certificate: certificatePem, privateKey: credentials.privateKey }));
  const qr = generateTLVString({ sellerName: document.seller.registrationName, vatNumber: document.seller.vatNumber ?? "",
    timestamp, invoiceTotal: document.taxInclusiveAmount.toFixed(2), vatTotal: document.taxTotal.toFixed(2),
    invoiceHash: hash, digitalSignature: signed.signatureValue, publicKey: signed.certificate.publicKeyBase64,
    certificateSignature: signed.certificate.signature.toString("base64"),
  });
  const xml = unwrap(replaceQrPlaceholder(unwrap(insertUBLExtensions(unsigned, signed.ublExtensions)), qr));
  if (unwrap(computeInvoiceHashFromXml(xml)) !== hash ||
      !verifyInvoiceSignature(hash, signed.signatureValue, signed.certificate.publicPoint)) {
    throw new Error("ZATCA_SIGNATURE_VALIDATION_FAILED");
  }
  return { uuid: document.uuid, hash, xml, qr };
}
