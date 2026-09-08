import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
const gitRef = String(process.env.VERCEL_GIT_COMMIT_REF ?? "").trim();
const previewSchemaRefs = new Set(["hee-v6-rc", "infro-business-memory-2026"]);
const isManagedPreview = vercelEnv === "preview" && previewSchemaRefs.has(gitRef);

if (!isManagedPreview) {
  console.log("[rc-preview-schema] SKIP — deployment is not an approved isolated schema-managed Preview");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[rc-preview-schema] REFUSED — DATABASE_URL is unavailable");
  process.exit(1);
}

function strictDatabaseUrl(raw) {
  const parsed = new URL(raw);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  const modes = parsed.searchParams.getAll("sslmode");
  if (modes.length !== 1) {
    throw new Error("DATABASE_URL must contain exactly one explicit sslmode");
  }
  const mode = String(modes[0] ?? "").trim().toLowerCase();
  if (["prefer", "require", "verify-ca"].includes(mode)) {
    parsed.searchParams.set("sslmode", "verify-full");
  } else if (mode !== "verify-full") {
    throw new Error("DATABASE_URL must use sslmode=verify-full");
  }
  return parsed.toString();
}

let connectionString;
try {
  connectionString = strictDatabaseUrl(process.env.DATABASE_URL);
} catch (error) {
  console.error("[rc-preview-schema] REFUSED — database transport is not strictly verified", {
    error: error instanceof Error ? error.message : "invalid DATABASE_URL",
  });
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const expected = readdirSync(migrationsDir)
  .filter((name) => /^\d{14}_[A-Za-z0-9_]+$/.test(name))
  .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
  .sort();

const client = new pg.Client({ connectionString });
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
      to_regclass('public."WhatsAppOperationsHeartbeat"') IS NOT NULL AS "whatsappHeartbeat",
      (SELECT data_type FROM information_schema.columns
        WHERE table_schema=current_schema() AND table_name='AnalyticsEvent' AND column_name='metadata') AS "analyticsMetadataType"
  `);
  const critical = schema.rows[0] ?? {};
  const incompatible = failed.length > 0 || pending.length > 0 || unexpected.length > 0
    || !critical.legalConsent || !critical.emailVerifiedAt || !critical.billingHeartbeat || !critical.whatsappHeartbeat
    || critical.analyticsMetadataType !== "jsonb";

  if (incompatible) {
    console.error("[rc-preview-schema] REFUSED — managed Preview database is not compatible with this release", {
      gitRef,
      expectedMigrationCount: expected.length,
      appliedMigrationCount: applied.length,
      pending,
      unexpected,
      failed,
      critical,
    });
    process.exitCode = 1;
  } else {
    console.log(`[rc-preview-schema] PASS — ${applied.length} migrations current; latest=${expected.at(-1) ?? "none"}; ref=${gitRef}`);
  }
} finally {
  await client.end();
}

if (process.exitCode) process.exit(process.exitCode);
