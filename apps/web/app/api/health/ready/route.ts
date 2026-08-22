import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEARTBEAT_MAX_AGE_MS = 90 * 60 * 1000;

function configured(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function isCanonical(value: string | undefined) {
  return String(value ?? "").trim().replace(/\/$/, "") === "https://hee.sa";
}

function productionDatabaseTransportReady() {
  try {
    const parsed = new URL(String(process.env.DATABASE_URL ?? ""));
    if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) return false;
    if (!parsed.hostname || ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())) return false;
    const sslMode = parsed.searchParams.get("sslmode")?.trim().toLowerCase();
    return Boolean(sslMode && new Set(["verify-full", "verify-ca", "require", "prefer"]).has(sslMode));
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

async function runtimeReady() {
  if (String(process.env.APP_ENV ?? "").trim().toLowerCase() !== "production") return false;
  if (!isCanonical(process.env.APP_URL) || !isCanonical(process.env.AUTH_ORIGIN) || !isCanonical(process.env.NEXT_PUBLIC_APP_URL)) return false;
  if (!productionDatabaseTransportReady() || !productionPoolReady() || !configured("SESSION_SECRET")) return false;
  if (!configured("RESEND_API_KEY") || !/@hee\.sa(?:>|\s|$)/i.test(String(process.env.HEE_FROM_EMAIL ?? ""))) return false;
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") return false;
  if (!String(process.env.MOYASAR_PUBLISHABLE_KEY ?? "").trim().startsWith("pk_live_")) return false;
  if (!String(process.env.MOYASAR_SECRET_KEY ?? "").trim().startsWith("sk_live_")) return false;
  if (!configured("MOYASAR_WEBHOOK_SECRET") || !configured("BILLING_TOKEN_ENCRYPTION_KEY")) return false;
  if (!configured("BILLING_SELLER_LEGAL_NAME_AR") || !configured("BILLING_SELLER_ADDRESS_AR")) return false;
  if (String(process.env.BILLING_TAX_STATUS ?? "").trim().toLowerCase() !== "not_registered") return false;
  if (!enabled("BILLING_RENEWAL_ENABLED") || !enabled("BILLING_OPERATIONS_READY")) return false;
  if (!enabled("PAID_CHECKOUT_PUBLIC_ENABLED")) return false;
  if (configured("BILLING_REHEARSAL_USER_EMAIL")) return false;
  if (!storageReady()) return false;

  await prisma.$queryRaw`SELECT 1`;

  const plans = await prisma.businessPlan.findMany({
    where: { code: { in: ["FREE", "BUSINESS", "PRO"] }, isActive: true },
    select: { code: true, monthlyPrice: true },
  });
  const prices = new Map(plans.map((plan) => [plan.code, plan.monthlyPrice]));
  if (prices.get("FREE") !== 0 || prices.get("BUSINESS") !== 199 || prices.get("PRO") !== 399) return false;

  const heartbeat = await prisma.billingOperationsHeartbeat.findUnique({ where: { id: "billing-operations" } });
  if (!heartbeat || Date.now() - heartbeat.lastSucceededAt.getTime() > HEARTBEAT_MAX_AGE_MS) return false;

  return true;
}

export async function GET() {
  try {
    const ready = await runtimeReady();
    const response = NextResponse.json({ ready }, { status: ready ? 200 : 503 });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  } catch {
    const response = NextResponse.json({ ready: false }, { status: 503 });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }
}
