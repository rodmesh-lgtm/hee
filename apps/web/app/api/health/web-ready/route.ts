import { NextResponse } from "next/server";
import { productionWebRuntimeReleaseSha } from "../../../lib/production-runtime-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const releaseSha = await productionWebRuntimeReleaseSha();
    const ready = Boolean(releaseSha);
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
