import "dotenv/config";

import { Client } from "pg";

const sourceUrl = String(process.env.SOURCE_DATABASE_URL ?? "").trim();
const restoreUrl = String(process.env.RESTORE_DATABASE_URL ?? "").trim();
if (!sourceUrl || !restoreUrl) throw new Error("SOURCE_DATABASE_URL and RESTORE_DATABASE_URL are required");
if (sourceUrl === restoreUrl) throw new Error("Restore proof refuses identical source and restore URLs");

const restoreDb = new URL(restoreUrl).pathname.replace(/^\//, "");
if (!/^hee_restore(?:_|$)/i.test(restoreDb)) throw new Error("Restore proof requires an isolated hee_restore* database");

const source = new Client({ connectionString: sourceUrl });
const restore = new Client({ connectionString: restoreUrl });

const tables = [
  "User",
  "Business",
  "Product",
  "Service",
  "Customer",
  "Order",
  "Booking",
  "StoredObject",
  "Subscription",
  "BillingPaymentMethod",
  "BillingPayment",
  "BillingWebhookEvent",
  "BillingCheckoutConsent",
  "BillingOperationsHeartbeat",
] as const;

type Signature = {
  exists: boolean;
  count?: string;
  minId?: string | null;
  maxId?: string | null;
  digest?: string | null;
};

type MigrationSignature = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableExists(client: Client, table: string) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${quoteIdentifier(table)}`],
  );
  return result.rows[0]?.exists === true;
}

async function signature(client: Client, table: string): Promise<Signature> {
  if (!(await tableExists(client, table))) return { exists: false };
  const escaped = quoteIdentifier(table);
  const result = await client.query<Omit<Signature, "exists">>(`
    SELECT COUNT(*)::text AS count,
           MIN("id")::text AS "minId",
           MAX("id")::text AS "maxId",
           MD5(COALESCE(STRING_AGG(MD5(ROW_TO_JSON(t)::text), '' ORDER BY "id"::text), '')) AS digest
    FROM public.${escaped} t
  `);
  return { exists: true, ...result.rows[0] };
}

async function financialSignature(client: Client) {
  const result = await client.query<{ rows: string; amount: string; paid: string }>(`
    SELECT COUNT(*)::text AS rows,
           COALESCE(SUM("amount"), 0)::text AS amount,
           COUNT(*) FILTER (WHERE "status"='paid')::text AS paid
    FROM public."BillingPayment"
  `);
  return result.rows[0];
}

async function migrationSignature(client: Client): Promise<MigrationSignature[]> {
  const result = await client.query<MigrationSignature>(`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM public."_prisma_migrations"
    ORDER BY migration_name
  `);
  return result.rows;
}

async function main() {
  await source.connect();
  await restore.connect();

  for (const table of tables) {
    const [a, b] = await Promise.all([signature(source, table), signature(restore, table)]);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error(`Backup restore signature mismatch for ${table}: source=${JSON.stringify(a)} restore=${JSON.stringify(b)}`);
    }
  }

  const [sourceFinancial, restoreFinancial] = await Promise.all([financialSignature(source), financialSignature(restore)]);
  if (JSON.stringify(sourceFinancial) !== JSON.stringify(restoreFinancial)) {
    throw new Error(`Backup restore financial signature mismatch: source=${JSON.stringify(sourceFinancial)} restore=${JSON.stringify(restoreFinancial)}`);
  }

  const [sourceMigrations, restoreMigrations] = await Promise.all([migrationSignature(source), migrationSignature(restore)]);
  if (!restoreMigrations.length || restoreMigrations.some((row) => !row.finished_at || row.rolled_back_at)) {
    throw new Error("Restored database does not contain a clean applied Prisma migration history");
  }
  if (JSON.stringify(sourceMigrations) !== JSON.stringify(restoreMigrations)) {
    throw new Error("Backup restore Prisma migration history does not exactly match production source");
  }

  console.log(`production-backup-restore-proof: PASS (${tables.length} critical table fingerprints + financial ledger + exact migration history)`);
}

main().catch((error) => {
  console.error("production-backup-restore-proof: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await Promise.allSettled([source.end(), restore.end()]);
});
