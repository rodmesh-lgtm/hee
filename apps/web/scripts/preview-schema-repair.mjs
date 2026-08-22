import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const EXPECTED_BRANCH = "ops-preview-schema-repair-20260822";
const EXPECTED_DATABASE_FINGERPRINT = "a942b37ccfaf5a81";
const BACKUP_SCHEMA = "hee_preview_backup_20260822_2050";
const STALE_HISTORY = ["20260805113822_init", "20260805124940_hee_core_architecture"];
const EXPECTED_BEFORE = [
  "20260805113822_init",
  "20260805124940_hee_core_architecture",
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
].sort();
const EXPECTED_LATEST = "20260822111500_billing_worker_release_provenance";
const EXPECTED_FINAL_COUNT = 30;

function fail(message) {
  console.error(`[preview-schema-repair] REFUSED: ${message}`);
  process.exit(1);
}
function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
function sameStrings(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

if (String(process.env.VERCEL_ENV ?? "").toLowerCase() !== "preview") fail("VERCEL_ENV is not preview");
if (process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) fail("unexpected git branch");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is unavailable");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let beforeCounts;
try {
  const identity = await client.query('SELECT current_database()::text AS "database"');
  const databaseName = String(identity.rows[0]?.database ?? "");
  const actualFingerprint = fingerprint(databaseName);
  if (actualFingerprint !== EXPECTED_DATABASE_FINGERPRINT) fail(`database fingerprint mismatch (${actualFingerprint})`);

  const schemaExists = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [BACKUP_SCHEMA]);
  if (schemaExists.rowCount) fail("backup schema already exists; refusing a repeated repair");

  const history = await client.query(`
    SELECT "migration_name", "finished_at", "rolled_back_at"
    FROM "_prisma_migrations"
    ORDER BY "migration_name"
  `);
  const applied = history.rows.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => String(row.migration_name));
  const failed = history.rows.filter((row) => !row.finished_at && !row.rolled_back_at).map((row) => String(row.migration_name));
  if (failed.length) fail(`failed migration history exists: ${JSON.stringify(failed)}`);
  if (!sameStrings(applied, EXPECTED_BEFORE)) fail(`migration history changed since diagnosis: ${JSON.stringify(applied)}`);

  const integrity = await client.query(`
    SELECT
      ((SELECT COUNT(*) FROM "Product" p JOIN "Category" c ON c."id"=p."categoryId" WHERE p."categoryId" IS NOT NULL AND p."businessId"<>c."businessId") +
       (SELECT COUNT(*) FROM "Order" o JOIN "Customer" c ON c."id"=o."customerId" WHERE o."businessId"<>c."businessId") +
       (SELECT COUNT(*) FROM "OrderItem" oi JOIN "Order" o ON o."id"=oi."orderId" JOIN "Product" p ON p."id"=oi."productId" WHERE oi."productId" IS NOT NULL AND o."businessId"<>p."businessId") +
       (SELECT COUNT(*) FROM "Booking" b JOIN "Customer" c ON c."id"=b."customerId" WHERE b."businessId"<>c."businessId") +
       (SELECT COUNT(*) FROM "Booking" b JOIN "Service" s ON s."id"=b."serviceId" WHERE b."serviceId" IS NOT NULL AND b."businessId"<>s."businessId") +
       (SELECT COUNT(*) FROM "ContactPerson" cp JOIN "Department" d ON d."id"=cp."departmentId" WHERE cp."departmentId" IS NOT NULL AND cp."businessId"<>d."businessId") +
       (SELECT COUNT(*) FROM "ContactPerson" cp JOIN "Branch" b ON b."id"=cp."branchId" WHERE cp."branchId" IS NOT NULL AND cp."businessId"<>b."businessId"))::int AS "crossTenant",
      (SELECT COUNT(*)::int FROM (SELECT "businessId" FROM "Subscription" WHERE "status"='active' GROUP BY "businessId" HAVING COUNT(*)>1) x) AS "duplicateSubscriptions",
      (SELECT COUNT(*)::int FROM (SELECT "businessId" FROM "Branch" WHERE "isMain"=true AND "isActive"=true GROUP BY "businessId" HAVING COUNT(*)>1) x) AS "duplicateMainBranches",
      (SELECT COUNT(*)::int FROM (SELECT "businessId" FROM "ContactPerson" WHERE "isPrimary"=true AND "isActive"=true GROUP BY "businessId" HAVING COUNT(*)>1) x) AS "duplicatePrimaryContacts",
      (SELECT COUNT(*)::int FROM "Order" WHERE "status" NOT IN ('pending','confirmed','processing','completed','cancelled')) AS "invalidOrders",
      (SELECT COUNT(*)::int FROM "Booking" WHERE "status" NOT IN ('pending','confirmed','completed','cancelled','no_show')) AS "invalidBookings",
      (SELECT COUNT(*)::int FROM "OrderItem" WHERE "quantity"<=0 OR "quantity">1000 OR "unitPrice"<0 OR "total"<0) AS "invalidOrderItems",
      (SELECT COUNT(*)::int FROM "Order" WHERE "total"<0) AS "invalidOrderTotals"
  `);
  const blockers = integrity.rows[0] ?? {};
  if (Object.values(blockers).some((value) => Number(value) !== 0)) fail(`data-integrity blockers exist: ${JSON.stringify(blockers)}`);

  const countsResult = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "User") AS users,
      (SELECT COUNT(*)::int FROM "Business") AS businesses,
      (SELECT COUNT(*)::int FROM "Customer") AS customers,
      (SELECT COUNT(*)::int FROM "Order") AS orders,
      (SELECT COUNT(*)::int FROM "Booking") AS bookings
  `);
  beforeCounts = countsResult.rows[0];
  if (Number(beforeCounts.customers) !== 0 || Number(beforeCounts.orders) !== 0 || Number(beforeCounts.bookings) !== 0) {
    fail(`Preview transaction data appeared since diagnosis: ${JSON.stringify(beforeCounts)}`);
  }

  console.log(`[preview-schema-repair] targetFingerprint=${actualFingerprint}`);
  console.log(`[preview-schema-repair] beforeCounts=${JSON.stringify(beforeCounts)}`);
  console.log(`[preview-schema-repair] integrity=${JSON.stringify(blockers)}`);

  await client.query(`CREATE SCHEMA ${quoteIdent(BACKUP_SCHEMA)}`);
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for (const row of tables.rows) {
    const table = String(row.tablename);
    await client.query(`CREATE TABLE ${quoteIdent(BACKUP_SCHEMA)}.${quoteIdent(table)} AS TABLE public.${quoteIdent(table)}`);
  }
  console.log(`[preview-schema-repair] backupSchema=${BACKUP_SCHEMA} tables=${tables.rowCount}`);

  await client.query("BEGIN");
  const removed = await client.query('DELETE FROM "_prisma_migrations" WHERE "migration_name" = ANY($1::text[]) RETURNING "migration_name"', [STALE_HISTORY]);
  if (removed.rowCount !== STALE_HISTORY.length || !sameStrings(removed.rows.map((row) => String(row.migration_name)), STALE_HISTORY)) {
    await client.query("ROLLBACK");
    fail("stale migration-history reconciliation did not match the exact expected rows");
  }
  await client.query("COMMIT");
  console.log(`[preview-schema-repair] reconciledHistoricalRows=${JSON.stringify(STALE_HISTORY)}`);
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  throw error;
} finally {
  await client.end();
}

const deploy = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
  cwd: process.cwd(), env: process.env, encoding: "utf8",
});
const deployOutput = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`
  .replaceAll(process.env.DATABASE_URL, "[DATABASE_URL_REDACTED]")
  .split("\n").filter((line) => !/^Datasource\s+/i.test(line.trim())).join("\n").trim();
if (deployOutput) console.log(`[preview-schema-repair] migrateDeployOutput:\n${deployOutput}`);
if (deploy.status !== 0) fail(`prisma migrate deploy failed with exit ${deploy.status ?? -1}; backup schema retained`);

const verify = new pg.Client({ connectionString: process.env.DATABASE_URL });
await verify.connect();
try {
  const history = await verify.query(`SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "migration_name"`);
  const applied = history.rows.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => String(row.migration_name));
  const failed = history.rows.filter((row) => !row.finished_at && !row.rolled_back_at).map((row) => String(row.migration_name));
  if (failed.length) fail(`failed migrations after deploy: ${JSON.stringify(failed)}`);
  if (applied.length !== EXPECTED_FINAL_COUNT || !applied.includes(EXPECTED_LATEST)) fail(`unexpected final migration state: count=${applied.length}`);
  if (STALE_HISTORY.some((name) => applied.includes(name))) fail("obsolete SQLite migration history returned unexpectedly");

  const schema = await verify.query(`
    SELECT
      to_regclass('public."LegalConsent"') IS NOT NULL AS "legalConsent",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='User' AND column_name='emailVerifiedAt') AS "emailVerifiedAt",
      to_regclass('public."BillingOperationsHeartbeat"') IS NOT NULL AS "heartbeat",
      (SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='AnalyticsEvent' AND column_name='metadata') AS "analyticsMetadataType"
  `);
  const s = schema.rows[0] ?? {};
  if (!s.legalConsent || !s.emailVerifiedAt || !s.heartbeat || s.analyticsMetadataType !== "jsonb") fail(`critical schema verification failed: ${JSON.stringify(s)}`);

  const countsResult = await verify.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "User") AS users,
      (SELECT COUNT(*)::int FROM "Business") AS businesses,
      (SELECT COUNT(*)::int FROM "Customer") AS customers,
      (SELECT COUNT(*)::int FROM "Order") AS orders,
      (SELECT COUNT(*)::int FROM "Booking") AS bookings
  `);
  const afterCounts = countsResult.rows[0];
  if (JSON.stringify(afterCounts) !== JSON.stringify(beforeCounts)) fail(`critical row counts changed: before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
  console.log(`[preview-schema-repair] afterCounts=${JSON.stringify(afterCounts)}`);
  console.log(`[preview-schema-repair] criticalSchema=${JSON.stringify(s)}`);
} finally {
  await verify.end();
}

const status = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "status"], {
  cwd: process.cwd(), env: process.env, encoding: "utf8",
});
if (status.status !== 0) fail(`final prisma migrate status failed with exit ${status.status ?? -1}`);
console.log("[preview-schema-repair] SUCCESS — Preview database is current; backup schema retained for post-journey verification");
