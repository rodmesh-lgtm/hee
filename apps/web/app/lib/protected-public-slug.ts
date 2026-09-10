import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { isProtectedPublicSlug, isRoutablePublicSlug, normalizePublicSlug } from "./public-url";

export const PROTECTED_SLUG_GRANT_EVENT = "admin_protected_slug_assigned";

type ProtectedSlugDatabase = Pick<Prisma.TransactionClient, "$queryRaw">;

export async function hasProtectedSlugAdminGrant(
  businessId: string,
  value: string,
  database: ProtectedSlugDatabase = db,
) {
  const slug = normalizePublicSlug(value);
  if (!businessId || !isProtectedPublicSlug(slug)) return false;
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "AnalyticsEvent"
    WHERE "businessId" = ${businessId}
      AND "eventType" = ${PROTECTED_SLUG_GRANT_EVENT}
      AND "metadata"->>'slug' = ${slug}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

/** Public pages and publishing may use protected names only after an admin grant. */
export async function canBusinessUsePublicSlug(businessId: string, value: string) {
  const slug = normalizePublicSlug(value);
  if (!isRoutablePublicSlug(slug)) return false;
  if (!isProtectedPublicSlug(slug)) return true;
  return hasProtectedSlugAdminGrant(businessId, slug);
}
