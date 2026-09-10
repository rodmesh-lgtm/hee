import "server-only";

import { createHash } from "node:crypto";
import { db } from "./db";

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
  // Empty/missing identities must never bypass throttling. Group them into a conservative
  // shared bucket so every current and future caller inherits fail-closed behavior.
  const identity = normalizeIdentity(input.identity) || "unknown";
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 10)));
  const windowSeconds = Math.max(30, Math.min(24 * 60 * 60, Math.floor(input.windowSeconds ?? 10 * 60)));
  const key = hashKey([input.scope, input.businessId, identity]);
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);

  // Expired-row pruning belongs to the controlled operational-retention job. Starting an
  // unawaited DELETE from request traffic can outlive a serverless invocation and terminate
  // a shared database connection while the request itself is still completing.
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
