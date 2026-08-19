import { NextResponse } from "next/server";
import { createOAuthAuthorization, type OAuthProvider } from "../../../../lib/oauth";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";

function asProvider(value: string): OAuthProvider | null { return value === "google" || value === "apple" ? value : null; }
function stateCookieName(provider: OAuthProvider) { return `hee_oauth_state_${provider}`; }

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider) return NextResponse.redirect(new URL("/login?oauth=unsupported-provider", request.url));
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const redirectTo = mode === "register" ? "/onboarding" : "/dashboard";

  // Starting OAuth creates a durable state row. Bound anonymous/repeated starts so a bot
  // cannot turn a redirect endpoint into unbounded database writes.
  try {
    const identity = requestClientAddress(request) || "unknown";
    const rate = await consumePublicWriteLimit({ scope: `oauth-start-${provider}`, businessId: "auth", identity, limit: 30, windowSeconds: 10 * 60 });
    if (!rate.allowed) {
      const response = NextResponse.redirect(new URL(`/${mode === "register" ? "register" : "login"}?oauth=too-many-attempts`, request.url));
      response.headers.set("Retry-After", String(Math.max(1, rate.retryAfterSeconds)));
      return response;
    }
  } catch (error) {
    console.error("[oauth-start] rate_limit_failed", { provider, error });
    const response = NextResponse.redirect(new URL(`/${mode === "register" ? "register" : "login"}?oauth=start-unavailable`, request.url));
    response.headers.set("Retry-After", "30");
    return response;
  }

  try {
    const authorizationUrl = await createOAuthAuthorization(provider, redirectTo);
    const state = new URL(authorizationUrl).searchParams.get("state");
    if (!state) throw new Error("missing-oauth-state");
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(stateCookieName(provider), state, { httpOnly: true, sameSite: provider === "apple" ? "none" : "lax", secure: provider === "apple" || process.env.NODE_ENV === "production", path: `/api/auth/oauth/${provider}/callback`, maxAge: 10 * 60 });
    return response;
  } catch (error) {
    console.error("[oauth-start] failed", { provider, error: error instanceof Error ? error.message : "unknown" });
    const code = error instanceof Error && error.message === "provider-not-configured" ? "provider-unavailable" : "start-failed";
    return NextResponse.redirect(new URL(`/${mode === "register" ? "register" : "login"}?oauth=${code}`, request.url));
  }
}
