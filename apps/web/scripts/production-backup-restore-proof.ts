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

type Signature = { count: string; minId: string | null; maxId: string | null };

async function signature(client: Client, table: string): Promise<Signature> {
  const escaped = `"${table.replaceAll('"', '""')}"`;
  const result = await client.query<Signature>(`SELECT COUNT(*)::text AS count, MIN("id")::text AS "minId", MAX("id")::text AS "maxId" FROM ${escaped}`);
  return result.rows[0];
}

async function financialSignature(client: Client) {
  const result = await client.query<{ rows: string; amount: string; paid: string }>(`
    SELECT COUNT(*)::text AS rows,
           COALESCE(SUM("amount"), 0)::text AS amount,
           COUNT(*) FILTER (WHERE "status"='paid')::text AS paid
    FROM "BillingPayment"
  `);
  return result.rows[0];
}

async function main() {
  await source.connect();
  await restore.connect();

  for (const table of tables) {
    const [a, b] = await Promise.all([signature(source, table), signature(restore, table)]);
    if (a.count !== b.count || a.minId !== b.minId || a.maxId !== b.maxId) {
      throw new Error(`Backup restore signature mismatch for ${table}: source=${JSON.stringify(a)} restore=${JSON.stringify(b)}`);
    }
  }

  const [sourceFinancial, restoreFinancial] = await Promise.all([financialSignature(source), financialSignature(restore)]);
  if (JSON.stringify(sourceFinancial) !== JSON.stringify(restoreFinancial)) {
    throw new Error(`Backup restore financial signature mismatch: source=${JSON.stringify(sourceFinancial)} restore=${JSON.stringify(restoreFinancial)}`);
  }

  const migrationRows = await restore.query<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>(`
    SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name
  `);
  if (!migrationRows.rows.length || migrationRows.rows.some((row) => !row.finished_at || row.rolled_back_at)) {
    throw new Error("Restored database does not contain a clean applied Prisma migration history");
  }

  console.log(`production-backup-restore-proof: PASS (${tables.length} critical tables + financial ledger + migration history)`);
}

main().catch((error) => {
  console.error("production-backup-restore-proof: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await Promise.allSettled([source.end(), restore.end()]);
});
