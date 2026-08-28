import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isPreviewQaEnvironment } from "../../../lib/qa-audit";
import { EXPECTED_PREVIEW_LATEST_MIGRATION, EXPECTED_PREVIEW_MIGRATIONS } from "../../../lib/qa-database-contract";

const EXPECTED_MIGRATION_COUNT = EXPECTED_PREVIEW_MIGRATIONS.length;

type ReadinessRow = {
  currentDatabase: string;
  migrationApplied: boolean;
  legalConsentTableExists: boolean;
  emailVerifiedAtColumnExists: boolean;
  billingOperationsHeartbeatTableExists: boolean;
  whatsappOperationsHeartbeatTableExists: boolean;
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

function databaseFingerprint(databaseName: string) {
  return createHash("sha256").update(databaseName).digest("hex").slice(0, 16);
}

export async function GET() {
  if (!isPreviewQaEnvironment()) return new NextResponse(null, { status: 404 });

  try {
    const rows = await db.$queryRaw<ReadinessRow[]>`
      SELECT
        current_database()::text AS "currentDatabase",
        EXISTS (
          SELECT 1 FROM "_prisma_migrations"
          WHERE "migration_name" = ${EXPECTED_PREVIEW_LATEST_MIGRATION}
            AND "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
        ) AS "migrationApplied",
        to_regclass('public."LegalConsent"') IS NOT NULL AS "legalConsentTableExists",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'User'
            AND column_name = 'emailVerifiedAt'
        ) AS "emailVerifiedAtColumnExists",
        to_regclass('public."BillingOperationsHeartbeat"') IS NOT NULL AS "billingOperationsHeartbeatTableExists",
        to_regclass('public."WhatsAppOperationsHeartbeat"') IS NOT NULL AS "whatsappOperationsHeartbeatTableExists",
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
      currentDatabase: "",
      migrationApplied: false,
      legalConsentTableExists: false,
      emailVerifiedAtColumnExists: false,
      billingOperationsHeartbeatTableExists: false,
      whatsappOperationsHeartbeatTableExists: false,
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
    const expectedSet = new Set<string>(EXPECTED_PREVIEW_MIGRATIONS);
    const pendingExpected = EXPECTED_PREVIEW_MIGRATIONS.filter((name) => !appliedSet.has(name));
    const unexpectedApplied = checks.appliedMigrationNames.filter((name) => !expectedSet.has(name));
    const blockerFree = Object.values(blockers).every((value) => value === 0);
    const migrationSetCurrent = pendingExpected.length === 0;
    const criticalSchemaCurrent = checks.migrationApplied
      && checks.legalConsentTableExists
      && checks.emailVerifiedAtColumnExists
      && checks.billingOperationsHeartbeatTableExists
      && checks.whatsappOperationsHeartbeatTableExists
      && checks.snapshotTableExists
      && checks.durationRangeConstraintExists
      && checks.bookingForeignKeyExists
      && checks.analyticsMetadataType === "jsonb";
    const ready = blockerFree && migrationSetCurrent && criticalSchemaCurrent;
    const { currentDatabase, ...publicChecks } = checks;

    return NextResponse.json({
      ready,
      migrationSafeToAttempt: blockerFree,
      databaseFingerprint: databaseFingerprint(currentDatabase),
      expected: { latestMigration: EXPECTED_PREVIEW_LATEST_MIGRATION, migrationCount: EXPECTED_MIGRATION_COUNT },
      migrationHistory: { pendingExpected, unexpectedApplied },
      checks: publicChecks,
      blockers,
      normalizationCandidates,
    }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[qa-database-readiness] probe_failed", error);
    return NextResponse.json({ ready: false, migrationSafeToAttempt: false, error: "database_readiness_probe_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
