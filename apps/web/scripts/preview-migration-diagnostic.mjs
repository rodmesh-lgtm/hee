import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const EXPECTED_BRANCH = "ops-preview-migration-diagnostic-20260822";
const EXPECTED_DATABASE_FINGERPRINT = "a942b37ccfaf5a81";

function fail(message) {
  console.error(`[preview-migration-diagnostic] REFUSED: ${message}`);
  process.exit(1);
}

if (String(process.env.VERCEL_ENV ?? "").toLowerCase() !== "preview") fail("VERCEL_ENV is not preview");
if (process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) fail("unexpected git branch");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is unavailable");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const identity = await client.query('SELECT current_database()::text AS "database"');
  const databaseName = String(identity.rows[0]?.database ?? "");
  const fingerprint = createHash("sha256").update(databaseName).digest("hex").slice(0, 16);
  if (fingerprint !== EXPECTED_DATABASE_FINGERPRINT) fail(`database fingerprint mismatch (${fingerprint})`);

  const history = await client.query(`
    SELECT "migration_name", "finished_at", "rolled_back_at"
    FROM "_prisma_migrations"
    ORDER BY "started_at", "migration_name"
  `);
  const applied = history.rows.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => row.migration_name);
  const failed = history.rows.filter((row) => !row.finished_at && !row.rolled_back_at).map((row) => row.migration_name);
  console.log(`[preview-migration-diagnostic] databaseFingerprint=${fingerprint}`);
  console.log(`[preview-migration-diagnostic] appliedMigrationCount=${applied.length}`);
  console.log(`[preview-migration-diagnostic] appliedMigrations=${JSON.stringify(applied)}`);
  console.log(`[preview-migration-diagnostic] failedMigrations=${JSON.stringify(failed)}`);
} finally {
  await client.end();
}

const status = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "status"], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
});
const raw = `${status.stdout ?? ""}\n${status.stderr ?? ""}`;
const sanitized = raw
  .replaceAll(process.env.DATABASE_URL, "[DATABASE_URL_REDACTED]")
  .split("\n")
  .filter((line) => !/^Datasource\s+/i.test(line.trim()))
  .join("\n")
  .trim();
console.log(`[preview-migration-diagnostic] prismaStatusExit=${status.status ?? -1}`);
if (sanitized) console.log(`[preview-migration-diagnostic] prismaStatusOutput:\n${sanitized}`);
console.log("[preview-migration-diagnostic] READ-ONLY COMPLETE");
