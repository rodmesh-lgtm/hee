import { spawnSync } from "node:child_process";

const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
const gitRef = String(process.env.VERCEL_GIT_COMMIT_REF ?? "").trim();
const isRcPreview = vercelEnv === "preview" && gitRef === "hee-v6-rc";

if (!isRcPreview) {
  console.log("[rc-preview-schema-sync] SKIP — not the hee-v6-rc Vercel Preview deployment");
  process.exit(0);
}

const rawDatabaseUrl = String(process.env.DATABASE_URL ?? "").trim();
if (!rawDatabaseUrl) {
  console.error("[rc-preview-schema-sync] REFUSED — DATABASE_URL is unavailable");
  process.exit(1);
}

let databaseUrl;
try {
  const parsed = new URL(rawDatabaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length !== 1) {
    throw new Error("DATABASE_URL must contain exactly one explicit sslmode");
  }
  const mode = String(sslModes[0] ?? "").trim().toLowerCase();
  if (["prefer", "require", "verify-ca"].includes(mode)) {
    parsed.searchParams.set("sslmode", "verify-full");
  } else if (mode !== "verify-full") {
    throw new Error("DATABASE_URL must use sslmode=verify-full");
  }
  databaseUrl = parsed.toString();
} catch (error) {
  console.error("[rc-preview-schema-sync] REFUSED — database transport is not strictly verified", {
    error: error instanceof Error ? error.message : "invalid DATABASE_URL",
  });
  process.exit(1);
}

console.log("[rc-preview-schema-sync] Applying committed Prisma migrations to the isolated RC Preview database");
const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    console.error("[rc-preview-schema-sync] FAILED — unable to start prisma migrate deploy", result.error);
    process.exit(1);
  }
  if (result.status === 0) break;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const transientUnavailable = /P1001|Can't reach database server/i.test(output);
  if (!transientUnavailable || attempt === maxAttempts) {
    console.error(`[rc-preview-schema-sync] FAILED — prisma migrate deploy exited with ${result.status ?? "unknown"}`);
    process.exit(result.status || 1);
  }
  const delayMs = attempt * 5_000;
  console.warn(`[rc-preview-schema-sync] Database temporarily unavailable; retrying ${attempt + 1}/${maxAttempts} after ${delayMs}ms`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

console.log("[rc-preview-schema-sync] PASS — committed migrations are applied");
