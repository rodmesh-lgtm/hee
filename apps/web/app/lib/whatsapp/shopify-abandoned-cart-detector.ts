import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { applyWhatsAppAutomationCartTransitionInTransaction } from "./automation-cart-lifecycle";

const DEFAULT_ABANDONMENT_MINUTES = 60;
const MIN_ABANDONMENT_MINUTES = 10;
const MAX_ABANDONMENT_MINUTES = 24 * 60;

type DetectorDb = Pick<PrismaClient, "$transaction">;

type Candidate = {
  businessId: string;
  cartId: string;
  contactId: string;
  occurredAt: Date;
  integrationId: string;
};

export function shopifyAbandonmentMinutes(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number(env.WHATSAPP_SHOPIFY_ABANDONMENT_MINUTES ?? DEFAULT_ABANDONMENT_MINUTES);
  if (!Number.isSafeInteger(parsed) || parsed < MIN_ABANDONMENT_MINUTES || parsed > MAX_ABANDONMENT_MINUTES) {
    throw new Error("WHATSAPP_SHOPIFY_ABANDONMENT_MINUTES_INVALID");
  }
  return parsed;
}

export async function detectNextAbandonedShopifyCart(input: {
  database?: DetectorDb;
  now?: Date;
  abandonmentMinutes?: number;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const abandonmentMinutes = input.abandonmentMinutes ?? shopifyAbandonmentMinutes();
  if (!Number.isSafeInteger(abandonmentMinutes) || abandonmentMinutes < MIN_ABANDONMENT_MINUTES || abandonmentMinutes > MAX_ABANDONMENT_MINUTES) {
    throw new Error("WHATSAPP_SHOPIFY_ABANDONMENT_MINUTES_INVALID");
  }
  const cutoff = new Date(now.getTime() - abandonmentMinutes * 60_000);

  return database.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<Candidate[]>(Prisma.sql`
      SELECT c."businessId", c."cartId", c."contactId", c."occurredAt", e."integrationId"
      FROM "WhatsAppAutomationCart" c
      JOIN LATERAL (
        SELECT ce."integrationId"
        FROM "WhatsAppAutomationCartEvent" ce
        WHERE ce."businessId" = c."businessId"
          AND ce."cartId" = c."cartId"
          AND ce."outcome" = 'applied'
          AND ce."integrationId" IS NOT NULL
        ORDER BY ce."occurredAt" DESC, ce."createdAt" DESC
        LIMIT 1
      ) e ON TRUE
      JOIN "WhatsAppCommerceIntegration" i
        ON i."id" = e."integrationId"
       AND i."businessId" = c."businessId"
       AND i."provider" = 'shopify'
       AND i."status" = 'active'
      WHERE c."state" = 'active'
        AND c."occurredAt" <= ${cutoff}
      ORDER BY c."occurredAt" ASC
      LIMIT 1
      FOR UPDATE OF c SKIP LOCKED
    `);
    const candidate = candidates[0];
    if (!candidate?.integrationId) return { processed: false as const };

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wa-cart:${candidate.businessId}:${candidate.cartId}`}))`;
    const current = await tx.whatsAppAutomationCart.findUnique({
      where: { businessId_cartId: { businessId: candidate.businessId, cartId: candidate.cartId } },
      select: { state: true, occurredAt: true, contactId: true },
    });
    if (!current || current.state !== "active" || current.occurredAt > cutoff || current.contactId !== candidate.contactId) {
      return { processed: true as const, outcome: "stale" as const };
    }

    const abandonedAt = new Date(current.occurredAt.getTime() + abandonmentMinutes * 60_000);
    const externalEventId = `shopify:abandoned:${candidate.cartId}:${current.occurredAt.toISOString()}`;
    const result = await applyWhatsAppAutomationCartTransitionInTransaction({
      businessId: candidate.businessId,
      integrationId: candidate.integrationId,
      externalEventId,
      cartId: candidate.cartId,
      contactId: candidate.contactId,
      state: "abandoned",
      occurredAt: abandonedAt,
      now,
    }, tx, now);

    return { processed: true as const, outcome: result.outcome, scheduled: result.scheduled, cartId: candidate.cartId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
