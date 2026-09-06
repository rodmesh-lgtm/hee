import { spawnSync } from "node:child_process";

const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
const gitRef = String(process.env.VERCEL_GIT_COMMIT_REF ?? "").trim();
const previewSchemaRefs = new Set(["hee-v6-rc", "infro-business-memory-2026"]);
const isManagedPreview = vercelEnv === "preview" && previewSchemaRefs.has(gitRef);

if (!isManagedPreview) {
  console.log("[rc-preview-schema-sync] SKIP — deployment is not an approved isolated schema-managed Preview");
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
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") throw new Error("DATABASE_URL must use PostgreSQL");
  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length !== 1) throw new Error("DATABASE_URL must contain exactly one explicit sslmode");
  const mode = String(sslModes[0] ?? "").trim().toLowerCase();
  if (["prefer", "require", "verify-ca"].includes(mode)) parsed.searchParams.set("sslmode", "verify-full");
  else if (mode !== "verify-full") throw new Error("DATABASE_URL must use sslmode=verify-full");
  databaseUrl = parsed.toString();
} catch (error) {
  console.error("[rc-preview-schema-sync] REFUSED — database transport is not strictly verified", { error: error instanceof Error ? error.message : "invalid DATABASE_URL" });
  process.exit(1);
}

const prisma = (args) => spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", ...args], {
  cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8",
});
const printResult = (result) => {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
};

console.log(`[rc-preview-schema-sync] Applying committed Prisma migrations to the isolated Preview database for ${gitRef}`);
const recoverablePreviewMigration = "20260906124500_business_productivity_progress";
let recoveredKnownFailedMigration = false;
const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  let result = prisma(["migrate", "deploy"]);
  printResult(result);
  if (result.error) {
    console.error("[rc-preview-schema-sync] FAILED — unable to start prisma migrate deploy", result.error);
    process.exit(1);
  }
  if (result.status === 0) break;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const knownFailedPreviewMigration = gitRef === "infro-business-memory-2026"
    && !recoveredKnownFailedMigration
    && /P3009/.test(output)
    && output.includes(recoverablePreviewMigration);
  if (knownFailedPreviewMigration) {
    console.warn(`[rc-preview-schema-sync] Recovering previously failed isolated Preview migration ${recoverablePreviewMigration}`);
    const resolve = prisma(["migrate", "resolve", "--rolled-back", recoverablePreviewMigration]);
    printResult(resolve);
    if (resolve.error || resolve.status !== 0) {
      console.error("[rc-preview-schema-sync] FAILED — unable to mark the known failed Preview migration as rolled back");
      process.exit(resolve.status || 1);
    }
    recoveredKnownFailedMigration = true;
    result = prisma(["migrate", "deploy"]);
    printResult(result);
    if (result.error || result.status !== 0) {
      console.error("[rc-preview-schema-sync] FAILED — migration deploy still failed after scoped Preview recovery");
      process.exit(result.status || 1);
    }
    break;
  }

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
