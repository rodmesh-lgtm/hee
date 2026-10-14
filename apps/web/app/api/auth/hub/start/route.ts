import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { HUB_ORIGIN, MAIN_ORIGIN, HUB_NONCE_COOKIE, hubCookieOptions, hubDigest, safeHubPath } from "../../../../lib/customer-hub";

export async function GET(request: NextRequest) {
  if (request.nextUrl.origin !== HUB_ORIGIN) return new NextResponse(null, { status: 404 });
  const nonce = randomBytes(32).toString("base64url");
  const target = new URL("/api/auth/hub/authorize", MAIN_ORIGIN);
  target.searchParams.set("challenge", hubDigest(nonce));
  target.searchParams.set("next", safeHubPath(request.nextUrl.searchParams.get("next")));
  const response = NextResponse.redirect(target);
  response.cookies.set(HUB_NONCE_COOKIE, nonce, hubCookieOptions);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
