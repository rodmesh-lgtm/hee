import { db } from "./db";

type SlugAliasResolution = {
  businessId: string;
  canonicalSlug: string;
};

export async function resolveBusinessSlugAlias(slug: string): Promise<SlugAliasResolution | null> {
  try {
    const rows = await db.$queryRaw<Array<SlugAliasResolution>>`
      SELECT a."businessId", b."slug" AS "canonicalSlug"
      FROM "BusinessSlugAlias" a
      JOIN "Business" b ON b."id" = a."businessId"
      WHERE a."slug" = ${slug}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch {
    // During a staged rollout the migration may not exist yet. Treat that
    // state as "no alias" so the current canonical route keeps working.
    return null;
  }
}
