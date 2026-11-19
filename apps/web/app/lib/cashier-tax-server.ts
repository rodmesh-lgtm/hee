import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { attachZatcaArtifact } from "./cashier-zatca-server";
import type { ZatcaLine, ZatcaBuyer } from "./cashier-zatca-document";
import { LaundryInputError } from "./laundry-domain";
import { CASHIER_OUTPUT_VAT_ACCOUNT, cashierVatFromGross, type CashierTaxDocument, type CashierTaxProfile } from "./cashier-tax";

export async function ensureCashierOutputVatAccount(tx: Prisma.TransactionClient, businessId: string) {
  const [book] = await tx.$queryRaw<Array<{ initializedAt: Date | null }>>`
    SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId" = ${businessId}
  `;
  if (!book?.initializedAt) throw new LaundryInputError("هيّئ دفتر المحاسبة أولًا لترحيل ضريبة المبيعات.");
  await tx.$executeRaw`
    INSERT INTO "LaundryAccount" ("businessId", code, name, kind)
    VALUES (${businessId}, ${CASHIER_OUTPUT_VAT_ACCOUNT}, 'ضريبة القيمة المضافة على المبيعات', 'liability')
    ON CONFLICT ("businessId", code) DO NOTHING
  `;
  const [account] = await tx.$queryRaw<Array<{ name: string; kind: string }>>`
    SELECT name, kind FROM "LaundryAccount" WHERE "businessId" = ${businessId} AND code = ${CASHIER_OUTPUT_VAT_ACCOUNT}
  `;
  if (account?.kind !== "liability" || account.name !== "ضريبة القيمة المضافة على المبيعات") {
    throw new LaundryInputError("رمز حساب ضريبة المبيعات مستخدم لحساب آخر. راجع دليل الحسابات.");
  }
}

export async function cashierTaxProfile(businessId: string, database: Prisma.TransactionClient = db) {
  const [profile] = await database.$queryRaw<CashierTaxProfile[]>`
    SELECT "sellerName", "sellerAddress", "vatNumber", "enabled"
    FROM "CashierTaxProfile" WHERE "businessId" = ${businessId}
  `;
  return profile ?? null;
}

export async function cashierOriginalTaxDocument(tx: Prisma.TransactionClient, businessId: string, ticketId: string) {
  const [document] = await tx.$queryRaw<Array<Omit<CashierTaxDocument,"issuedAt"> & { issuedAt: Date }>>`
    SELECT "sellerName", "sellerAddress", "vatNumber", "number", "issuedAt", "gross", "vat", "originalNumber"
    FROM "CashierTaxDocument" WHERE "businessId" = ${businessId} AND "ticketId" = ${ticketId} AND "returnId" IS NULL
  `;
  return document ?? null;
}

/** Call within the existing laundry business lock and source transaction. */
export async function issueCashierTaxDocument(tx: Prisma.TransactionClient, input: {
  businessId: string; ticketId: string; gross: number; seller: Omit<CashierTaxProfile,"enabled">;
  lines?: ZatcaLine[]; method?: string; buyer?: ZatcaBuyer; supplyDate?: string;
  credit?: { id: string; originalNumber: number; previousGross: number; reason?: string };
}) {
  const { businessId, ticketId, gross, seller, credit } = input;
  const previousGross = credit?.previousGross ?? 0;
  const vat = cashierVatFromGross(previousGross + gross) - cashierVatFromGross(previousGross);
  const [document] = await tx.$queryRaw<Array<{ number: number; issuedAt: Date }>>`
    INSERT INTO "CashierTaxDocument" ("businessId", "ticketId", "returnId", "number", "sellerName",
      "sellerAddress", "vatNumber", "gross", "vat", "originalNumber")
    SELECT ${businessId}, ${ticketId}, ${credit?.id ?? null}, COALESCE(MAX("number"),0) + 1,
      ${seller.sellerName}, ${seller.sellerAddress}, ${seller.vatNumber}, ${gross}, ${vat}, ${credit?.originalNumber ?? null}
    FROM "CashierTaxDocument" WHERE "businessId" = ${businessId}
    RETURNING number,"issuedAt"
  `;
  if (input.lines) await attachZatcaArtifact(tx, { ...document, businessId, gross, vat, seller, lines: input.lines,
    method: input.method, buyer: input.buyer, supplyDate: input.supplyDate, credit: credit ? { number: credit.originalNumber, reason: credit.reason ?? "" } : undefined });
  return vat;
}

export const cashierInvoiceTaxDocument = Prisma.sql`
  (SELECT to_jsonb(d) - 'businessId' - 'ticketId' - 'returnId' || jsonb_build_object('zatca',CASE WHEN r.number IS NOT NULL THEN jsonb_build_object('qr',COALESCE(r."clearedQr",r.qr),'status',r.status,'buyer',r.buyer) END) FROM "CashierTaxDocument" d
   LEFT JOIN "CashierZatcaReport" r ON (r."businessId",r.number)=(d."businessId",d.number)
   WHERE d."businessId" = "LaundryTicket"."businessId" AND d."ticketId" = "LaundryTicket".id AND d."returnId" IS NULL) AS "taxDocument"
`;

export const cashierReturnTaxDocument = Prisma.sql`
  (SELECT to_jsonb(d) - 'businessId' - 'ticketId' - 'returnId' || jsonb_build_object('zatca',CASE WHEN r.number IS NOT NULL THEN jsonb_build_object('qr',COALESCE(r."clearedQr",r.qr),'status',r.status,'buyer',r.buyer) END) FROM "CashierTaxDocument" d
   LEFT JOIN "CashierZatcaReport" r ON (r."businessId",r.number)=(d."businessId",d.number)
   WHERE d."businessId" = "CashierReturn"."businessId" AND d."returnId" = "CashierReturn".id) AS "taxDocument"
`;
