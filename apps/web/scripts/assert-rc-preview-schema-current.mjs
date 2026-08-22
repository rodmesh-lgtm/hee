import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const isRcPreview = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase() === "preview"
  && process.env.VERCEL_GIT_COMMIT_REF === "hee-v6-rc";

if (!isRcPreview) {
  console.log("[rc-preview-schema] SKIP — not the hee-v6-rc Vercel Preview deployment");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[rc-preview-schema] REFUSED — DATABASE_URL is unavailable");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const expected = readdirSync(migrationsDir)
  .filter((name) => /^\d{14}_[A-Za-z0-9_]+$/.test(name))
  .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
  .sort();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const history = await client.query(`
    SELECT "migration_name", "finished_at", "rolled_back_at"
    FROM "_prisma_migrations"
    ORDER BY "migration_name"
  `);
  const failed = history.rows
    .filter((row) => !row.finished_at && !row.rolled_back_at)
    .map((row) => String(row.migration_name));
  const applied = history.rows
    .filter((row) => row.finished_at && !row.rolled_back_at)
    .map((row) => String(row.migration_name))
    .sort();
  const appliedSet = new Set(applied);
  const expectedSet = new Set(expected);
  const pending = expected.filter((name) => !appliedSet.has(name));
  const unexpected = applied.filter((name) => !expectedSet.has(name));

  const schema = await client.query(`
    SELECT
      to_regclass('public."LegalConsent"') IS NOT NULL AS "legalConsent",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema=current_schema() AND table_name='User' AND column_name='emailVerifiedAt'
      ) AS "emailVerifiedAt",
      to_regclass('public."BillingOperationsHeartbeat"') IS NOT NULL AS "billingHeartbeat",
      (SELECT data_type FROM information_schema.columns
        WHERE table_schema=current_schema() AND table_name='AnalyticsEvent' AND column_name='metadata') AS "analyticsMetadataType"
  `);
  const critical = schema.rows[0] ?? {};

  if (failed.length || pending.length || unexpected.length
      || !critical.legalConsent || !critical.emailVerifiedAt || !critical.billingHeartbeat
      || critical.analyticsMetadataType !== "jsonb") {
    console.error("[rc-preview-schema] REFUSED — RC Preview database is not compatible with this release", {
      expectedMigrationCount: expected.length,
      appliedMigrationCount: applied.length,
      pending,
      unexpected,
      failed,
      critical,
    });
    process.exitCode = 1;
    return;
  }

  console.log(`[rc-preview-schema] PASS — ${applied.length} migrations current; latest=${expected.at(-1) ?? "none"}`);
} finally {
  await client.end();
}
