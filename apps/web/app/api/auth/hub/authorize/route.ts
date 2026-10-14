import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentSessionIdForUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { syncWorkspaceBusinessPreference } from "../../../../lib/active-business";
import { HUB_ORIGIN, MAIN_ORIGIN, HUB_RETURN_COOKIE, HUB_PROVIDER, hubCookieOptions, hubDigest, validHubChallenge, safeHubPath, sealHubSession } from "../../../../lib/customer-hub";

export async function GET(request: NextRequest) {
  if (request.nextUrl.origin !== MAIN_ORIGIN) return new NextResponse(null, { status: 404 });
  const pending = new URLSearchParams(request.cookies.get(HUB_RETURN_COOKIE)?.value ?? "");
  const challenge = request.nextUrl.searchParams.get("challenge") ?? pending.get("challenge") ?? "";
  const next = safeHubPath(request.nextUrl.searchParams.get("next") ?? pending.get("next"));
  if (!validHubChallenge(challenge)) return NextResponse.redirect(new URL("/api/auth/hub/start", HUB_ORIGIN));
  const user = await getCurrentUser();
  const sessionId = user ? await getCurrentSessionIdForUser(user.id) : null;
  const token = request.cookies.get("__Host-hee_session")?.value;
  if (!user || !sessionId || !token) {
    const response = NextResponse.redirect(new URL("/login", MAIN_ORIGIN));
    response.cookies.set(HUB_RETURN_COOKIE, new URLSearchParams({ challenge, next }).toString(), hubCookieOptions);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  const code = randomBytes(32).toString("base64url");
  await syncWorkspaceBusinessPreference();
  await db.oAuthState.deleteMany({ where: { provider: HUB_PROVIDER, expiresAt: { lt: new Date() } } });
  await db.oAuthState.create({ data: { state: hubDigest(code), provider: HUB_PROVIDER, nonce: hubDigest(challenge), codeVerifier: sealHubSession(token, challenge), redirectTo: next, expiresAt: new Date(Date.now() + 60_000) } });
  const target = new URL("/api/auth/hub/complete", HUB_ORIGIN);
  target.searchParams.set("code", code);
  const response = NextResponse.redirect(target);
  response.cookies.delete(HUB_RETURN_COOKIE);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
