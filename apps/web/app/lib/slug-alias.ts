import "server-only";
import { db } from "./db";

type SlugAliasResolution = {
  businessId: string;
  canonicalSlug: string;
};

export async function resolveBusinessSlugAlias(slug: string): Promise<SlugAliasResolution | null> {
  const rows = await db.$queryRaw<Array<SlugAliasResolution>>`
    SELECT a."businessId", b."slug" AS "canonicalSlug"
    FROM "BusinessSlugAlias" a
    JOIN "Business" b ON b."id" = a."businessId"
    WHERE a."slug" = ${slug}
      AND b."deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Business.slug is globally unique and historical aliases are reserved by a DB trigger.
 * Keep application availability checks aligned with those database invariants.
 */
export async function isBusinessSlugReserved(slug: string, excludeBusinessId?: string | null) {
  const [business, aliases] = await Promise.all([
    db.business.findFirst({
      where: { slug, ...(excludeBusinessId ? { id: { not: excludeBusinessId } } : {}) },
      select: { id: true },
    }),
    db.$queryRaw<Array<{ businessId: string }>>`
      SELECT "businessId"
      FROM "BusinessSlugAlias"
      WHERE "slug" = ${slug}
      LIMIT 1
    `,
  ]);
  if (business) return true;
  const alias = aliases[0];
  return Boolean(alias && alias.businessId !== excludeBusinessId);
}
