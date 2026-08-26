import { prisma } from "@/lib/prisma";
import { isProductionRuntime } from "./runtime-environment";

function configured(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function isCanonical(value: string | undefined) {
  return String(value ?? "").trim().replace(/\/$/, "") === "https://ir.sa";
}

function runtimeReleaseSha() {
  const value = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
}

function productionDatabaseTransportReady() {
  try {
    const parsed = new URL(String(process.env.DATABASE_URL ?? ""));
    if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) return false;
    if (!parsed.hostname || ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())) return false;
    const sslModes = parsed.searchParams.getAll("sslmode");
    return sslModes.length === 1 && String(sslModes[0] ?? "").trim().toLowerCase() === "verify-full";
  } catch {
    return false;
  }
}

function productionPoolReady() {
  const raw = String(process.env.PG_POOL_MAX ?? "").trim();
  if (!/^\d+$/.test(raw)) return false;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 && value <= 5;
}

function storageReady() {
  const driver = String(process.env.STORAGE_DRIVER ?? "database").trim().toLowerCase();
  if (driver === "database") return true;
  if (driver !== "s3") return false;
  return Boolean(
    String(process.env.S3_ENDPOINT ?? "").trim().startsWith("https://")
    && configured("S3_BUCKET")
    && configured("S3_ACCESS_KEY_ID")
    && configured("S3_SECRET_ACCESS_KEY")
    && !enabled("S3_ALLOW_INSECURE"),
  );
}

function optionalProviderReady(names: string[]) {
  const values = names.map((name) => String(process.env[name] ?? "").trim());
  return !values.some(Boolean) || values.every(Boolean);
}

export async function productionWebRuntimeReleaseSha() {
  if (!isProductionRuntime()) return null;
  if (enabled("PRODUCTION_MAINTENANCE_MODE")) return null;

  const releaseSha = runtimeReleaseSha();
  if (!releaseSha) return null;
  if (!isCanonical(process.env.APP_URL) || !isCanonical(process.env.AUTH_ORIGIN) || !isCanonical(process.env.NEXT_PUBLIC_APP_URL)) return null;
  if (!productionDatabaseTransportReady() || !productionPoolReady() || !configured("SESSION_SECRET")) return null;
  if (configured("QA_AUDIT_SECRET") || configured("QA_AUDIT_USER_EMAIL")) return null;
  if (!configured("RESEND_API_KEY") || !/@ir\.sa(?:>|\s|$)/i.test(String(process.env.HEE_FROM_EMAIL ?? ""))) return null;
  if (!storageReady()) return null;
  if (!optionalProviderReady(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])) return null;
  if (!optionalProviderReady(["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"])) return null;

  await prisma.$queryRaw`SELECT 1`;
  return releaseSha;
}
