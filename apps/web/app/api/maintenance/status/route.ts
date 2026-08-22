import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function maintenanceEnabled() {
  return String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production"
    && String(process.env.PRODUCTION_MAINTENANCE_MODE ?? "").trim().toLowerCase() === "true";
}

function releaseSha() {
  return String(process.env.RELEASE_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "").trim() || null;
}

export async function GET() {
  return NextResponse.json(
    {
      service: "hee-web",
      maintenance: maintenanceEnabled(),
      releaseSha: releaseSha(),
      environment: String(process.env.APP_ENV ?? "").trim().toLowerCase() || null,
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
