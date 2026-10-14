import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { HUB_ORIGIN, HUB_NONCE_COOKIE, HUB_PROVIDER, hubDigest, safeHubPath, openHubSession } from "../../../../lib/customer-hub";

export async function GET(request: NextRequest) {
  if (request.nextUrl.origin !== HUB_ORIGIN) return new NextResponse(null, { status: 404 });
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const nonce = request.cookies.get(HUB_NONCE_COOKIE)?.value ?? "";
  const fail = () => new NextResponse("انتهت صلاحية الانتقال. ارجع إلى لوحة التحكم وسجّل الدخول مجددًا.", { status: 400, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/plain; charset=utf-8" } });
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) return fail();
  const challenge = hubDigest(nonce);
  const state = hubDigest(code);
  const entry = await db.$transaction(async (tx) => {
    const row = await tx.oAuthState.findUnique({ where: { state } });
    if (!row || row.provider !== HUB_PROVIDER || row.nonce !== hubDigest(challenge) || row.expiresAt <= new Date()) return null;
    const consumed = await tx.oAuthState.deleteMany({ where: { id: row.id } });
    return consumed.count === 1 ? row : null;
  });
  if (!entry?.codeVerifier) return fail();
  let token: string;
  try { token = openHubSession(entry.codeVerifier, challenge); } catch { return fail(); }
  const session = await db.session.findUnique({ where: { token: `hee_session_sha256:${hubDigest(token)}` }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.deletedAt) return fail();
  const response = NextResponse.redirect(new URL(safeHubPath(entry.redirectTo), HUB_ORIGIN));
  // Reuse the same server-side session, with separate host-only browser cookies.
  // Logout, password changes and session revocation invalidate both hosts at once.
  response.cookies.set("__Host-hee_session", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: session.expiresAt });
  response.cookies.delete(HUB_NONCE_COOKIE);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
