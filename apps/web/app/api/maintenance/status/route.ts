import { NextResponse } from "next/server";
import { appEnvironment, isProductionRuntime, vercelEnvironment } from "../../../lib/runtime-environment";

export const dynamic = "force-dynamic";

function maintenanceEnabled() {
  return isProductionRuntime()
    && String(process.env.PRODUCTION_MAINTENANCE_MODE ?? "").trim().toLowerCase() === "true";
}

function releaseSha() {
  return String(process.env.RELEASE_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "").trim() || null;
}

function environment() {
  if (isProductionRuntime()) return "production";
  return appEnvironment() || vercelEnvironment() || null;
}

export async function GET() {
  return NextResponse.json(
    {
      service: "hee-web",
      maintenance: maintenanceEnabled(),
      releaseSha: releaseSha(),
      environment: environment(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
