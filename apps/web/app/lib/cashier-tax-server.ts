import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { cashierVatFromGross, type CashierTaxDocument, type CashierTaxProfile } from "./cashier-tax";

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
  credit?: { id: string; originalNumber: number; previousGross: number };
}) {
  const { businessId, ticketId, gross, seller, credit } = input;
  const previousGross = credit?.previousGross ?? 0;
  const vat = cashierVatFromGross(previousGross + gross) - cashierVatFromGross(previousGross);
  await tx.$executeRaw`
    INSERT INTO "CashierTaxDocument" ("businessId", "ticketId", "returnId", "number", "sellerName",
      "sellerAddress", "vatNumber", "gross", "vat", "originalNumber")
    SELECT ${businessId}, ${ticketId}, ${credit?.id ?? null}, COALESCE(MAX("number"),0) + 1,
      ${seller.sellerName}, ${seller.sellerAddress}, ${seller.vatNumber}, ${gross}, ${vat}, ${credit?.originalNumber ?? null}
    FROM "CashierTaxDocument" WHERE "businessId" = ${businessId}
  `;
  return vat;
}

export const cashierInvoiceTaxDocument = Prisma.sql`
  (SELECT to_jsonb(d) - 'businessId' - 'ticketId' - 'returnId' FROM "CashierTaxDocument" d
   WHERE d."businessId" = "LaundryTicket"."businessId" AND d."ticketId" = "LaundryTicket".id AND d."returnId" IS NULL) AS "taxDocument"
`;

export const cashierReturnTaxDocument = Prisma.sql`
  (SELECT to_jsonb(d) - 'businessId' - 'ticketId' - 'returnId' FROM "CashierTaxDocument" d
   WHERE d."businessId" = "CashierReturn"."businessId" AND d."returnId" = "CashierReturn".id) AS "taxDocument"
`;
