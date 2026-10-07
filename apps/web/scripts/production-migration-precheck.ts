import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { assertProductionMigrationPrefix, type AppliedMigration } from "./production-migration-prefix";

async function main() {
  const connectionString = String(process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");
  const root = new URL("../prisma/migrations/", import.meta.url);
  const directories = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory() && /^\d{14}_[A-Za-z0-9_]+$/.test(entry.name));
  const local = await Promise.all(directories.map(async entry => ({ name: entry.name, checksum: createHash("sha256").update(await readFile(new URL(`${entry.name}/migration.sql`, root))).digest("hex") })));
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const { rows } = await client.query<AppliedMigration>('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public."_prisma_migrations" ORDER BY migration_name');
    const pending = assertProductionMigrationPrefix(local, rows);
    console.log(`production-migration-precheck: PASS (clean, checksum-matched release prefix; ${pending.length} pending migrations)`);
    for (const name of pending) console.log(`pending: ${name}`);
  } finally { await client.end(); }
}
main().catch(error => { console.error("production-migration-precheck: FAIL", error instanceof Error && /MIGRATION|LOCAL_/.test(error.message) ? error.message : "DATABASE_HISTORY_UNAVAILABLE"); process.exitCode = 1; });
