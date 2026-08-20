import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isPreviewQaEnvironment } from "../../../lib/qa-audit";

type ReadinessRow = {
  migrationApplied: boolean;
  snapshotTableExists: boolean;
  durationRangeConstraintExists: boolean;
  bookingForeignKeyExists: boolean;
};

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPreviewQaEnvironment()) return new NextResponse(null, { status: 404 });

  try {
    const rows = await db.$queryRaw<ReadinessRow[]>`
      SELECT
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE "migration_name" = '20260820124500_booking_duration_snapshot'
            AND "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
        ) AS "migrationApplied",
        to_regclass('public."BookingDurationSnapshot"') IS NOT NULL AS "snapshotTableExists",
        EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'BookingDurationSnapshot_duration_range'
        ) AS "durationRangeConstraintExists",
        EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'BookingDurationSnapshot_booking_fkey'
        ) AS "bookingForeignKeyExists"
    `;
    const readiness = rows[0] ?? {
      migrationApplied: false,
      snapshotTableExists: false,
      durationRangeConstraintExists: false,
      bookingForeignKeyExists: false,
    };
    const ready = Object.values(readiness).every(Boolean);
    return NextResponse.json({ ready, checks: readiness }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-database-readiness] probe_failed", error);
    return NextResponse.json({ ready: false, error: "database_readiness_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
