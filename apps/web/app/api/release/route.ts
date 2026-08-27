import { NextResponse } from "next/server";
import { appEnvironment, vercelEnvironment } from "../../lib/runtime-environment";

export const dynamic = "force-dynamic";

export async function GET() {
  const releaseSha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "").trim();
  const environment = appEnvironment() || vercelEnvironment();

  const response = NextResponse.json(
    {
      service: "hee-web",
      releaseSha: releaseSha || null,
      environment: environment || null,
    },
    { status: releaseSha ? 200 : 503 },
  );

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
