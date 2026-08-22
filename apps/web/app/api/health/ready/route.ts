import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEARTBEAT_MAX_AGE_MS = 90 * 60 * 1000;

function configured(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function isCanonical(value: string | undefined) {
  return String(value ?? "").trim().replace(/\/$/, "") === "https://hee.sa";
}

async function runtimeReady() {
  if (String(process.env.APP_ENV ?? "").trim().toLowerCase() !== "production") return false;
  if (!isCanonical(process.env.APP_URL) || !isCanonical(process.env.AUTH_ORIGIN) || !isCanonical(process.env.NEXT_PUBLIC_APP_URL)) return false;
  if (!configured("DATABASE_URL") || !configured("SESSION_SECRET")) return false;
  if (!configured("RESEND_API_KEY") || !/@hee\.sa(?:>|\s|$)/i.test(String(process.env.HEE_FROM_EMAIL ?? ""))) return false;
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") return false;
  if (!String(process.env.MOYASAR_PUBLISHABLE_KEY ?? "").trim().startsWith("pk_live_")) return false;
  if (!String(process.env.MOYASAR_SECRET_KEY ?? "").trim().startsWith("sk_live_")) return false;
  if (!configured("MOYASAR_WEBHOOK_SECRET") || !configured("BILLING_TOKEN_ENCRYPTION_KEY")) return false;
  if (String(process.env.BILLING_RENEWAL_ENABLED ?? "").trim().toLowerCase() !== "true") return false;
  if (String(process.env.BILLING_OPERATIONS_READY ?? "").trim().toLowerCase() !== "true") return false;

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
