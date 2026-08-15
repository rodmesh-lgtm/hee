import "server-only";

import { createHash } from "node:crypto";
import { db } from "./db";

let rateLimitTableReady = false;

async function ensureRateLimitTable() {
  if (rateLimitTableReady) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RequestRateLimit" (
      "key" TEXT NOT NULL,
      "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "count" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("key")
    )
  `);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RequestRateLimit_updatedAt_idx" ON "RequestRateLimit"("updatedAt")`);
  // A stable hashed key is kept per scope/business/identity. Prune cold entries so bot traffic
  // cannot make this defensive table grow without bound. This runs once per server process.
  await db.$executeRawUnsafe(`DELETE FROM "RequestRateLimit" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'`);
  rateLimitTableReady = true;
}

function hashKey(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function normalizeIdentity(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().slice(0, 180);
}

export function requestClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "";
}

export async function consumePublicWriteLimit(input: {
  scope: string;
  businessId: string;
  identity: string;
  limit?: number;
  windowSeconds?: number;
}) {
  const identity = normalizeIdentity(input.identity);
  if (!identity) return { allowed: true, remaining: input.limit ?? 10, retryAfterSeconds: 0 };

  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 10)));
  const windowSeconds = Math.max(30, Math.min(24 * 60 * 60, Math.floor(input.windowSeconds ?? 10 * 60)));
  const key = hashKey([input.scope, input.businessId, identity]);
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);

  await ensureRateLimitTable();
  const rows = await db.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "RequestRateLimit" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RequestRateLimit"."windowStart" < ${cutoff} THEN 1
        ELSE "RequestRateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RequestRateLimit"."windowStart" < ${cutoff} THEN ${now}
        ELSE "RequestRateLimit"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "windowStart"
  `;

  const row = rows[0];
  const count = row?.count ?? 1;
  const windowStart = row?.windowStart ?? now;
  const retryAfterSeconds = count > limit
    ? Math.max(1, Math.ceil((windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000))
    : 0;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}
