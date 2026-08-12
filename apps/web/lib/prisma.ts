import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

type GlobalPrisma = {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function getDatabaseUrl() {
  const fallbackUrl = "postgresql://hee:hee123@127.0.0.1:5432/hee?schema=public";
  const rawUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL ?? fallbackUrl;

  if (!rawUrl || rawUrl.trim() === "" || rawUrl === "base") {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname === "base") {
      return fallbackUrl;
    }
    return rawUrl;
  } catch {
    return fallbackUrl;
  }
}

function getPool() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString: getDatabaseUrl() });
  }

  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
