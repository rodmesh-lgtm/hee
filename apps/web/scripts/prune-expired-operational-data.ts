import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");

const apply = process.argv.includes("--apply");
if (apply && process.env.ALLOW_RETENTION_PURGE !== "true") {
  throw new Error("Refusing retention purge: set ALLOW_RETENTION_PURGE=true and pass --apply explicitly");
}

const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function counts() {
  const now = new Date();
  const [sessions, oauthStates, rateLimits, submissions] = await Promise.all([
    db.session.count({ where: { expiresAt: { lt: now } } }),
    db.oAuthState.count({ where: { expiresAt: { lt: now } } }),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "RequestRateLimit" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'`,
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "PublicSubmission" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'`,
  ]);
  return {
    expiredSessions: sessions,
    expiredOAuthStates: oauthStates,
    staleRateLimits: Number(rateLimits[0]?.count ?? 0n),
    stalePublicSubmissions: Number(submissions[0]?.count ?? 0n),
  };
}

async function main() {
  const before = await counts();
  console.log("retention-prune candidate counts", before);
  if (!apply) {
    console.log("retention-prune: DRY RUN (pass --apply with ALLOW_RETENTION_PURGE=true to delete ephemeral rows)");
    return;
  }

  const now = new Date();
  const [sessionDelete, oauthDelete, rateLimitDelete, submissionDelete] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.oAuthState.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.$executeRaw`DELETE FROM "RequestRateLimit" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'`,
    db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'`,
  ]);

  console.log("retention-prune deleted", {
    sessions: sessionDelete.count,
    oauthStates: oauthDelete.count,
    rateLimits: rateLimitDelete,
    publicSubmissions: submissionDelete,
  });
}

main()
  .catch((error) => { console.error("retention-prune: FAIL", error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); await pool.end(); });
