import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isPreviewQaEnvironment } from "../../../lib/qa-audit";

const EXPECTED_LATEST_MIGRATION = "20260820124500_booking_duration_snapshot";
const EXPECTED_MIGRATION_COUNT = 22;

type ReadinessRow = {
  migrationApplied: boolean;
  snapshotTableExists: boolean;
  durationRangeConstraintExists: boolean;
  bookingForeignKeyExists: boolean;
  appliedMigrationCount: number;
  latestAppliedMigration: string | null;
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
          WHERE "migration_name" = ${EXPECTED_LATEST_MIGRATION}
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
        ) AS "bookingForeignKeyExists",
        (
          SELECT COUNT(*)::int
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
        ) AS "appliedMigrationCount",
        (
          SELECT "migration_name"
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
          ORDER BY "finished_at" DESC, "migration_name" DESC
          LIMIT 1
        ) AS "latestAppliedMigration"
    `;
    const checks = rows[0] ?? {
      migrationApplied: false,
      snapshotTableExists: false,
      durationRangeConstraintExists: false,
      bookingForeignKeyExists: false,
      appliedMigrationCount: 0,
      latestAppliedMigration: null,
    };
    const migrationSetCurrent = checks.migrationApplied && checks.appliedMigrationCount >= EXPECTED_MIGRATION_COUNT;
    const ready = migrationSetCurrent && checks.snapshotTableExists && checks.durationRangeConstraintExists && checks.bookingForeignKeyExists;
    return NextResponse.json({
      ready,
      expected: { latestMigration: EXPECTED_LATEST_MIGRATION, migrationCount: EXPECTED_MIGRATION_COUNT },
      checks,
    }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-database-readiness] probe_failed", error);
    return NextResponse.json({ ready: false, error: "database_readiness_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
