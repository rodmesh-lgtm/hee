import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isPreviewQaEnvironment } from "../../../lib/qa-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPreviewQaEnvironment()) return new NextResponse(null, { status: 404 });

  try {
    const [summary] = await db.$queryRaw<Array<{
      activeBusinesses: number;
      ownersWithActiveBusinesses: number;
      ownersWithMultipleActiveBusinesses: number;
      maxActiveBusinessesPerOwner: number;
      duplicateOwnersUsingTestDomains: number;
      duplicateOwnersUsingNonTestDomains: number;
      activeBusinessesOwnedByDuplicateOwners: number;
    }>>`
      WITH active AS (
        SELECT b."ownerId", COUNT(*)::int AS count
        FROM "Business" b
        WHERE b."deletedAt" IS NULL
        GROUP BY b."ownerId"
      ), duplicates AS (
        SELECT a."ownerId", a.count,
          CASE
            WHEN lower(u."email") LIKE '%@hee.test'
              OR lower(u."email") LIKE '%@example.com'
              OR lower(u."email") LIKE 'rc-%'
              OR lower(u."email") LIKE 'qa-%'
            THEN true ELSE false
          END AS "looksTestOnly"
        FROM active a
        JOIN "User" u ON u."id" = a."ownerId"
        WHERE a.count > 1
      )
      SELECT
        COALESCE((SELECT COUNT(*)::int FROM "Business" WHERE "deletedAt" IS NULL), 0) AS "activeBusinesses",
        COALESCE((SELECT COUNT(*)::int FROM active), 0) AS "ownersWithActiveBusinesses",
        COALESCE((SELECT COUNT(*)::int FROM duplicates), 0) AS "ownersWithMultipleActiveBusinesses",
        COALESCE((SELECT MAX(count)::int FROM active), 0) AS "maxActiveBusinessesPerOwner",
        COALESCE((SELECT COUNT(*)::int FROM duplicates WHERE "looksTestOnly" = true), 0) AS "duplicateOwnersUsingTestDomains",
        COALESCE((SELECT COUNT(*)::int FROM duplicates WHERE "looksTestOnly" = false), 0) AS "duplicateOwnersUsingNonTestDomains",
        COALESCE((SELECT SUM(count)::int FROM duplicates), 0) AS "activeBusinessesOwnedByDuplicateOwners"
    `;

    const checks = summary ?? {
      activeBusinesses: 0,
      ownersWithActiveBusinesses: 0,
      ownersWithMultipleActiveBusinesses: 0,
      maxActiveBusinessesPerOwner: 0,
      duplicateOwnersUsingTestDomains: 0,
      duplicateOwnersUsingNonTestDomains: 0,
      activeBusinessesOwnedByDuplicateOwners: 0,
    };

    return NextResponse.json({
      safeToEnforceSingleActiveBusinessPerOwner: checks.ownersWithMultipleActiveBusinesses === 0,
      duplicateOwnersAppearTestOnly: checks.ownersWithMultipleActiveBusinesses > 0 && checks.duplicateOwnersUsingNonTestDomains === 0,
      checks,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-owner-cardinality] probe_failed", error);
    return NextResponse.json({ safeToEnforceSingleActiveBusinessPerOwner: false, error: "owner_cardinality_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
