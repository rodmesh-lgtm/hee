import { NextResponse } from "next/server";
import { createOAuthAuthorization, type OAuthProvider } from "../../../../lib/oauth";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";

function asProvider(value: string): OAuthProvider | null { return value === "google" || value === "apple" ? value : null; }
function stateCookieName(provider: OAuthProvider) { return `hee_oauth_state_${provider}`; }
function safeAppOrigin(request: Request) {
  if (process.env.VERCEL_ENV === "production") return "https://hee.sa";
  try {
    const origin = new URL(request.url);
    const host = origin.hostname.toLowerCase();
    const allowed = host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host.endsWith(".app.github.dev") || host === "hee.sa" || host === "www.hee.sa";
    return allowed ? origin.origin : "https://hee.sa";
  } catch { return "https://hee.sa"; }
}
function redirectToApp(request: Request, path: string) { return NextResponse.redirect(new URL(path, safeAppOrigin(request))); }

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider) return redirectToApp(request, "/login?oauth=unsupported-provider");
  const { searchParams } = new URL(request.url);

  // Social registration is not exposed in the current product and, more importantly,
  // would bypass the explicit Terms/Privacy checkbox on /register. Keep OAuth login-only
  // until a consent-aware social registration flow is implemented and audited.
  if (searchParams.get("mode") === "register") return redirectToApp(request, "/register?oauth=consent-required");
  const redirectTo = "/dashboard";

  try {
    const identity = requestClientAddress(request) || "unknown";
    const rate = await consumePublicWriteLimit({ scope: `oauth-start-${provider}`, businessId: "auth", identity, limit: 30, windowSeconds: 10 * 60 });
    if (!rate.allowed) {
      const response = redirectToApp(request, "/login?oauth=too-many-attempts");
      response.headers.set("Retry-After", String(Math.max(1, rate.retryAfterSeconds)));
      return response;
    }
  } catch (error) {
    console.error("[oauth-start] rate_limit_failed", { provider, error });
    const response = redirectToApp(request, "/login?oauth=start-unavailable");
    response.headers.set("Retry-After", "30");
    return response;
  }

  try {
    const authorizationUrl = await createOAuthAuthorization(provider, redirectTo);
    const state = new URL(authorizationUrl).searchParams.get("state");
    if (!state) throw new Error("missing-oauth-state");
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(stateCookieName(provider), state, { httpOnly: true, sameSite: provider === "apple" ? "none" : "lax", secure: true, path: `/api/auth/oauth/${provider}/callback`, maxAge: 10 * 60 });
    return response;
  } catch (error) {
    console.error("[oauth-start] failed", { provider, error: error instanceof Error ? error.message : "unknown" });
    const code = error instanceof Error && error.message === "provider-not-configured" ? "provider-unavailable" : "start-failed";
    return redirectToApp(request, `/login?oauth=${code}`);
  }
}
