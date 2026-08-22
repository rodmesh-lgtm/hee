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

type TableProof = { count: string; fingerprint: string };
type Proof = { version: 1; tables: Record<string, TableProof> };

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableProof(client: Client, table: string): Promise<TableProof> {
  const escaped = quoteIdentifier(table);
  const result = await client.query<TableProof>(`
    SELECT
      COUNT(*)::text AS count,
      md5(COALESCE(string_agg(md5(row_to_json(t)::text), '' ORDER BY t."id"::text), '')) AS fingerprint
    FROM ${escaped} t
  `);
  return result.rows[0];
}

async function capture(client: Client): Promise<Proof> {
  const entries = await Promise.all(tables.map(async (table) => [table, await tableProof(client, table)] as const));
  return { version: 1, tables: Object.fromEntries(entries) };
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const current = await capture(client);

    if (mode === "--capture") {
      await writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      console.log(`production-migration-data-proof: CAPTURED ${tables.length} critical tables`);
      return;
    }

    const expected = JSON.parse(await readFile(filePath, "utf8")) as Proof;
    if (expected.version !== 1) throw new Error("Unsupported production migration proof version");

    for (const table of tables) {
      const before = expected.tables?.[table];
      const after = current.tables[table];
      if (!before || before.count !== after.count || before.fingerprint !== after.fingerprint) {
        throw new Error(`Critical data changed during production migration for ${table}: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
      }
    }

    console.log(`production-migration-data-proof: PASS (${tables.length} critical tables unchanged)`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("production-migration-data-proof: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
