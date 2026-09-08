import { NextResponse } from "next/server";
import { createOAuthAuthorization, type OAuthProvider } from "../../../../lib/oauth";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";

function asProvider(value: string): OAuthProvider | null { return value === "google" || value === "apple" ? value : null; }
function stateCookieName(provider: OAuthProvider) { return `hee_oauth_state_${provider}`; }
function safeAppOrigin(request: Request) {
  if (process.env.VERCEL_ENV === "production") return "https://ir.sa";
  try {
    const origin = new URL(request.url);
    const host = origin.hostname.toLowerCase();
    const allowed = host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host.endsWith(".app.github.dev") || host === "ir.sa" || host === "www.ir.sa";
    return allowed ? origin.origin : "https://ir.sa";
  } catch { return "https://ir.sa"; }
}
function redirectToApp(request: Request, path: string) { return NextResponse.redirect(new URL(path, safeAppOrigin(request))); }

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider) return redirectToApp(request, "/login?oauth=unsupported-provider");
  const { searchParams } = new URL(request.url);
  const registration = searchParams.get("mode") === "register";

  // Social registration is allowed only after the customer explicitly accepts the
  // same Terms/Privacy consent presented on /register. The server validates this
  // marker as well as the client UI so a hand-crafted registration URL cannot bypass
  // the consent gate.
  if (registration && searchParams.get("consent") !== "accepted") {
    return redirectToApp(request, "/register?oauth=consent-required");
  }
  const redirectTo = registration ? "/onboarding" : "/dashboard";

  try {
    const identity = requestClientAddress(request) || "unknown";
    const rate = await consumePublicWriteLimit({ scope: `oauth-start-${provider}`, businessId: "auth", identity, limit: 30, windowSeconds: 10 * 60 });
    if (!rate.allowed) {
      const response = redirectToApp(request, `/${registration ? "register" : "login"}?oauth=too-many-attempts`);
      response.headers.set("Retry-After", String(Math.max(1, rate.retryAfterSeconds)));
      return response;
    }
  } catch (error) {
    console.error("[oauth-start] rate_limit_failed", { provider, error });
    const response = redirectToApp(request, `/${registration ? "register" : "login"}?oauth=start-unavailable`);
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
    return redirectToApp(request, `/${registration ? "register" : "login"}?oauth=${code}`);
  }
}
