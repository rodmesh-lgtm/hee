import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";

const databaseUrl = String(process.env.DATABASE_URL ?? "").trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const [mode, filePath] = process.argv.slice(2);
if (!filePath || !["--capture", "--verify"].includes(mode)) {
  throw new Error("Usage: production-migration-data-proof.ts --capture <file> | --verify <file>");
}

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

type TableProof = { exists: boolean; count?: string; fingerprint?: string; columns?: string[] };
type Proof = { version: 3; tables: Record<string, TableProof> };

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

async function tableColumns(client: Client, table: string) {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function tableProof(client: Client, table: string, preserveColumns?: string[]): Promise<TableProof> {
  if (!(await tableExists(client, table))) return { exists: false };
  const escaped = quoteIdentifier(table);
  const currentColumns = await tableColumns(client, table);
  const columns = preserveColumns ?? currentColumns;
  if (!columns.length || !columns.includes("id")) throw new Error(`Critical table ${table} must include id in its migration proof`);

  const missing = columns.filter((column) => !currentColumns.includes(column));
  if (missing.length) throw new Error(`Critical migration removed pre-existing columns from ${table}: ${missing.join(", ")}`);

  const extra = currentColumns.filter((column) => !columns.includes(column));
  const rowExpression = extra.length ? `(to_jsonb(t) - $1::text[])` : `to_jsonb(t)`;
  const result = await client.query<{ count: string; fingerprint: string }>(`
    SELECT
      COUNT(*)::text AS count,
      md5(COALESCE(string_agg(md5(${rowExpression}::text), '' ORDER BY t."id"::text), '')) AS fingerprint
    FROM ${escaped} t
  `, extra.length ? [extra] : []);
  return { exists: true, ...result.rows[0], columns };
}

async function capture(client: Client): Promise<Proof> {
  const entries = await Promise.all(tables.map(async (table) => [table, await tableProof(client, table)] as const));
  return { version: 3, tables: Object.fromEntries(entries) };
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (mode === "--capture") {
      const current = await capture(client);
      await writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      const existing = Object.values(current.tables).filter((table) => table.exists).length;
      console.log(`production-migration-data-proof: CAPTURED ${existing}/${tables.length} existing critical tables`);
      return;
    }

    const expected = JSON.parse(await readFile(filePath, "utf8")) as Proof;
    if (expected.version !== 3) throw new Error("Unsupported production migration proof version");

    for (const table of tables) {
      const before = expected.tables?.[table];
      if (!before) throw new Error(`Missing critical table proof for ${table}`);

      // A migration may legitimately create a table that did not exist before it ran.
      if (!before.exists) continue;
      if (!before.columns?.length) throw new Error(`Missing pre-migration column inventory for ${table}`);

      // Fingerprint only the columns that existed at capture time. Additive nullable/defaulted
      // schema changes therefore do not masquerade as customer-data mutations, while removed
      // pre-existing columns, row count changes, and any old-column value changes still fail.
      const after = await tableProof(client, table, before.columns);
      if (!after.exists || before.count !== after.count || before.fingerprint !== after.fingerprint) {
        throw new Error(`Critical data changed during production migration for ${table}: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
      }
    }

    console.log("production-migration-data-proof: PASS (all pre-existing critical columns and rows unchanged)");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("production-migration-data-proof: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
