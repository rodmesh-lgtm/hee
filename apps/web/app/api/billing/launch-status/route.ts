import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function releaseSha() {
  const value = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
}

function launchMode() {
  if (enabled("PAID_CHECKOUT_PUBLIC_ENABLED")) return "public" as const;
  if (String(process.env.BILLING_REHEARSAL_USER_EMAIL ?? "").trim()) return "rehearsal" as const;
  return "closed" as const;
}

export async function GET() {
  const response = NextResponse.json({
    service: "hee-web",
    releaseSha: releaseSha(),
    environment: String(process.env.APP_ENV ?? "").trim().toLowerCase() || null,
    mode: launchMode(),
    billingOperationsReady: enabled("BILLING_OPERATIONS_READY"),
    renewalEnabled: enabled("BILLING_RENEWAL_ENABLED"),
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
