import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { normalizePostgresDatabaseUrl } from "./database-url";

type GlobalPrisma = {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function validatedDatabaseUrl() {
  const configured = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL;
  const localFallback = "postgresql://hee:hee123@127.0.0.1:5432/hee?schema=public";
  const rawUrl = configured?.trim() || (process.env.NODE_ENV === "production" ? "" : localFallback);

  if (!rawUrl) {
    throw new Error("HEE database configuration is missing: set DATABASE_URL in this environment");
  }

  return normalizePostgresDatabaseUrl(rawUrl);
}

function poolSize() {
  const configured = Number.parseInt(String(process.env.PG_POOL_MAX ?? "5"), 10);
  return Number.isFinite(configured) ? Math.max(1, Math.min(20, configured)) : 5;
}

function getPool() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString: validatedDatabaseUrl(),
      max: poolSize(),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg(getPool()) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
// Reuse one Prisma client and pg pool per warm Node.js isolate in development and production.
globalForPrisma.prisma = prisma;

// Standalone cron/systemd workers must close both Prisma and the underlying pg Pool or
// the Node process can remain alive after work completes. Application request handlers
// never call this helper; it is intentionally reserved for one-shot operational scripts.
export async function closePrismaForWorker() {
  const client = globalForPrisma.prisma;
  const pool = globalForPrisma.pgPool;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  if (client) await client.$disconnect();
  if (pool) await pool.end();
}
