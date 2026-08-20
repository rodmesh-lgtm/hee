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
    }>>`
      WITH active AS (
        SELECT "ownerId", COUNT(*)::int AS count
        FROM "Business"
        WHERE "deletedAt" IS NULL
        GROUP BY "ownerId"
      )
      SELECT
        COALESCE((SELECT COUNT(*)::int FROM "Business" WHERE "deletedAt" IS NULL), 0) AS "activeBusinesses",
        COALESCE(COUNT(*)::int, 0) AS "ownersWithActiveBusinesses",
        COALESCE(COUNT(*) FILTER (WHERE count > 1)::int, 0) AS "ownersWithMultipleActiveBusinesses",
        COALESCE(MAX(count)::int, 0) AS "maxActiveBusinessesPerOwner"
      FROM active
    `;

    const checks = summary ?? {
      activeBusinesses: 0,
      ownersWithActiveBusinesses: 0,
      ownersWithMultipleActiveBusinesses: 0,
      maxActiveBusinessesPerOwner: 0,
    };

    return NextResponse.json({
      safeToEnforceSingleActiveBusinessPerOwner: checks.ownersWithMultipleActiveBusinesses === 0,
      checks,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-owner-cardinality] probe_failed", error);
    return NextResponse.json({ safeToEnforceSingleActiveBusinessPerOwner: false, error: "owner_cardinality_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
