import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isPreviewQaEnvironment } from "../../../lib/qa-audit";

const EXPECTED_MIGRATIONS = [
  "20260808052423_init",
  "20260809033945_add_product_unit",
  "20260809035147_add_page_modules",
  "20260809070559_add_onboarding_fields",
  "20260809080000_add_onboarding_step_column",
  "20260811113000_add_stored_object",
  "20260814183000_hee_v3_smart_business_profile",
  "20260815100000_add_social_auth",
  "20260815113000_portable_storage_backend",
  "20260815120000_public_write_rate_limit",
  "20260816120000_preserve_business_slug_aliases",
  "20260819053000_enforce_tenant_relation_integrity",
  "20260819054500_enforce_single_active_designations",
  "20260819061500_prevent_accidental_customer_data_cascade",
  "20260819064000_optimize_analytics_access",
  "20260819104500_protect_customer_history",
  "20260820090000_convert_analytics_metadata_to_jsonb",
  "20260820100000_freeze_tenant_record_ownership",
  "20260820103000_unique_pending_admin_requests",
  "20260820110000_legal_consent_audit",
  "20260820113000_public_transactions_integrity",
  "20260820124500_booking_duration_snapshot",
] as const;
const EXPECTED_LATEST_MIGRATION = EXPECTED_MIGRATIONS.at(-1)!;
const EXPECTED_MIGRATION_COUNT = EXPECTED_MIGRATIONS.length;

type ReadinessRow = {
  migrationApplied: boolean;
  snapshotTableExists: boolean;
  durationRangeConstraintExists: boolean;
  bookingForeignKeyExists: boolean;
  appliedMigrationCount: number;
  latestAppliedMigration: string | null;
  appliedMigrationNames: string[];
  analyticsMetadataType: string | null;
  crossTenantRelations: number;
  duplicateActiveSubscriptions: number;
  duplicateMainBranches: number;
  duplicatePrimaryContacts: number;
  invalidOrderStatuses: number;
  invalidBookingStatuses: number;
  invalidOrderTypes: number;
  invalidOrderItemQuantities: number;
  invalidOrderAmounts: number;
  invalidBookingDates: number;
  invalidBookingTimes: number;
  duplicateActiveBookingSlots: number;
};

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPreviewQaEnvironment()) return new NextResponse(null, { status: 404 });

  try {
    const rows = await db.$queryRaw<ReadinessRow[]>`
      SELECT
        EXISTS (
          SELECT 1 FROM "_prisma_migrations"
          WHERE "migration_name" = ${EXPECTED_LATEST_MIGRATION}
            AND "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
        ) AS "migrationApplied",
        to_regclass('public."BookingDurationSnapshot"') IS NOT NULL AS "snapshotTableExists",
        EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingDurationSnapshot_duration_range') AS "durationRangeConstraintExists",
        EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingDurationSnapshot_booking_fkey') AS "bookingForeignKeyExists",
        (
          SELECT COUNT(*)::int FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
        ) AS "appliedMigrationCount",
        (
          SELECT "migration_name" FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
          ORDER BY "finished_at" DESC, "migration_name" DESC LIMIT 1
        ) AS "latestAppliedMigration",
        ARRAY(
          SELECT "migration_name" FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
          ORDER BY "migration_name"
        ) AS "appliedMigrationNames",
        (
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'AnalyticsEvent' AND column_name = 'metadata'
          LIMIT 1
        ) AS "analyticsMetadataType",
        (
          (SELECT COUNT(*) FROM "Product" p JOIN "Category" c ON c."id" = p."categoryId" WHERE p."categoryId" IS NOT NULL AND p."businessId" <> c."businessId") +
          (SELECT COUNT(*) FROM "Order" o JOIN "Customer" c ON c."id" = o."customerId" WHERE o."businessId" <> c."businessId") +
          (SELECT COUNT(*) FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId" JOIN "Product" p ON p."id" = oi."productId" WHERE oi."productId" IS NOT NULL AND o."businessId" <> p."businessId") +
          (SELECT COUNT(*) FROM "Booking" b JOIN "Customer" c ON c."id" = b."customerId" WHERE b."businessId" <> c."businessId") +
          (SELECT COUNT(*) FROM "Booking" b JOIN "Service" s ON s."id" = b."serviceId" WHERE b."serviceId" IS NOT NULL AND b."businessId" <> s."businessId") +
          (SELECT COUNT(*) FROM "ContactPerson" cp JOIN "Department" d ON d."id" = cp."departmentId" WHERE cp."departmentId" IS NOT NULL AND cp."businessId" <> d."businessId") +
          (SELECT COUNT(*) FROM "ContactPerson" cp JOIN "Branch" b ON b."id" = cp."branchId" WHERE cp."branchId" IS NOT NULL AND cp."businessId" <> b."businessId")
        )::int AS "crossTenantRelations",
        (
          SELECT COUNT(*)::int FROM (
            SELECT "businessId" FROM "Subscription" WHERE "status" = 'active' GROUP BY "businessId" HAVING COUNT(*) > 1
          ) duplicate_subscriptions
        ) AS "duplicateActiveSubscriptions",
        (
          SELECT COUNT(*)::int FROM (
            SELECT "businessId" FROM "Branch" WHERE "isMain" = true AND "isActive" = true GROUP BY "businessId" HAVING COUNT(*) > 1
          ) duplicate_branches
        ) AS "duplicateMainBranches",
        (
          SELECT COUNT(*)::int FROM (
            SELECT "businessId" FROM "ContactPerson" WHERE "isPrimary" = true AND "isActive" = true GROUP BY "businessId" HAVING COUNT(*) > 1
          ) duplicate_contacts
        ) AS "duplicatePrimaryContacts",
        (SELECT COUNT(*)::int FROM "Order" WHERE "status" NOT IN ('pending','confirmed','processing','completed','cancelled')) AS "invalidOrderStatuses",
        (SELECT COUNT(*)::int FROM "Booking" WHERE "status" NOT IN ('pending','confirmed','completed','cancelled','no_show')) AS "invalidBookingStatuses",
        (SELECT COUNT(*)::int FROM "Order" WHERE "orderType" NOT IN ('استلام','pickup','delivery','request')) AS "invalidOrderTypes",
        (SELECT COUNT(*)::int FROM "OrderItem" WHERE "quantity" <= 0 OR "quantity" > 1000) AS "invalidOrderItemQuantities",
        (
          (SELECT COUNT(*) FROM "OrderItem" WHERE "unitPrice" < 0 OR "total" < 0) +
          (SELECT COUNT(*) FROM "Order" WHERE "total" < 0)
        )::int AS "invalidOrderAmounts",
        (SELECT COUNT(*)::int FROM "Booking" WHERE "bookingDate" !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') AS "invalidBookingDates",
        (SELECT COUNT(*)::int FROM "Booking" WHERE "bookingTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') AS "invalidBookingTimes",
        (
          SELECT COUNT(*)::int FROM (
            SELECT "businessId", "serviceId", "bookingDate", "bookingTime"
            FROM "Booking"
            WHERE "serviceId" IS NOT NULL AND "status" IN ('pending','confirmed')
            GROUP BY "businessId", "serviceId", "bookingDate", "bookingTime"
            HAVING COUNT(*) > 1
          ) duplicate_slots
        ) AS "duplicateActiveBookingSlots"
    `;

    const checks = rows[0] ?? {
      migrationApplied: false,
      snapshotTableExists: false,
      durationRangeConstraintExists: false,
      bookingForeignKeyExists: false,
      appliedMigrationCount: 0,
      latestAppliedMigration: null,
      appliedMigrationNames: [],
      analyticsMetadataType: null,
      crossTenantRelations: 0,
      duplicateActiveSubscriptions: 0,
      duplicateMainBranches: 0,
      duplicatePrimaryContacts: 0,
      invalidOrderStatuses: 0,
      invalidBookingStatuses: 0,
      invalidOrderTypes: 0,
      invalidOrderItemQuantities: 0,
      invalidOrderAmounts: 0,
      invalidBookingDates: 0,
      invalidBookingTimes: 0,
      duplicateActiveBookingSlots: 0,
    };

    const blockers = {
      crossTenantRelations: checks.crossTenantRelations,
      invalidOrderStatuses: checks.invalidOrderStatuses,
      invalidBookingStatuses: checks.invalidBookingStatuses,
      invalidOrderTypes: checks.invalidOrderTypes,
      invalidOrderItemQuantities: checks.invalidOrderItemQuantities,
      invalidOrderAmounts: checks.invalidOrderAmounts,
      invalidBookingDates: checks.invalidBookingDates,
      invalidBookingTimes: checks.invalidBookingTimes,
      duplicateActiveBookingSlots: checks.duplicateActiveBookingSlots,
    };
    const normalizationCandidates = {
      duplicateActiveSubscriptions: checks.duplicateActiveSubscriptions,
      duplicateMainBranches: checks.duplicateMainBranches,
      duplicatePrimaryContacts: checks.duplicatePrimaryContacts,
    };
    const appliedSet = new Set(checks.appliedMigrationNames);
    const expectedSet = new Set<string>(EXPECTED_MIGRATIONS);
    const pendingExpected = EXPECTED_MIGRATIONS.filter((name) => !appliedSet.has(name));
    const unexpectedApplied = checks.appliedMigrationNames.filter((name) => !expectedSet.has(name));
    const blockerFree = Object.values(blockers).every((value) => value === 0);
    const migrationSetCurrent = pendingExpected.length === 0;
    const ready = blockerFree && migrationSetCurrent && checks.snapshotTableExists && checks.durationRangeConstraintExists && checks.bookingForeignKeyExists;

    return NextResponse.json({
      ready,
      migrationSafeToAttempt: blockerFree,
      expected: { latestMigration: EXPECTED_LATEST_MIGRATION, migrationCount: EXPECTED_MIGRATION_COUNT },
      migrationHistory: { pendingExpected, unexpectedApplied },
      checks,
      blockers,
      normalizationCandidates,
    }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-database-readiness] probe_failed", error);
    return NextResponse.json({ ready: false, migrationSafeToAttempt: false, error: "database_readiness_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
