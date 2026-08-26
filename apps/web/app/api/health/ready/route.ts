import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productionWebRuntimeReleaseSha } from "../../../lib/production-runtime-readiness";

export const dynamic = "force-dynamic";

const HEARTBEAT_MAX_AGE_MS = 90 * 60 * 1000;

function configured(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

async function runtimeReady() {
  const releaseSha = await productionWebRuntimeReleaseSha();
  if (!releaseSha) return false;

  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") return false;
  if (!String(process.env.MOYASAR_PUBLISHABLE_KEY ?? "").trim().startsWith("pk_live_")) return false;
  if (!String(process.env.MOYASAR_SECRET_KEY ?? "").trim().startsWith("sk_live_")) return false;
  if (!configured("MOYASAR_WEBHOOK_SECRET") || !configured("BILLING_TOKEN_ENCRYPTION_KEY")) return false;
  if (!configured("BILLING_SELLER_LEGAL_NAME_AR") || !configured("BILLING_SELLER_ADDRESS_AR")) return false;
  if (String(process.env.BILLING_TAX_STATUS ?? "").trim().toLowerCase() !== "not_registered") return false;
  if (!enabled("BILLING_RENEWAL_ENABLED") || !enabled("BILLING_OPERATIONS_READY")) return false;
  if (!enabled("PAID_CHECKOUT_PUBLIC_ENABLED")) return false;
  if (configured("BILLING_REHEARSAL_USER_EMAIL")) return false;

  const plans = await prisma.businessPlan.findMany({
    where: { code: { in: ["FREE", "BUSINESS", "PRO"] }, isActive: true },
    select: { code: true, monthlyPrice: true },
  });
  const prices = new Map(plans.map((plan) => [plan.code, plan.monthlyPrice]));
  if (prices.get("FREE") !== 0 || prices.get("BUSINESS") !== 199 || prices.get("PRO") !== 399) return false;

  const heartbeat = await prisma.billingOperationsHeartbeat.findUnique({ where: { id: "billing-operations" } });
  if (!heartbeat || Date.now() - heartbeat.lastSucceededAt.getTime() > HEARTBEAT_MAX_AGE_MS) return false;
  if (String(heartbeat.releaseSha ?? "").trim().toLowerCase() !== releaseSha) return false;

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
