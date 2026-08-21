import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../../../../lib/db";
import { createSession } from "../../../../../lib/auth";
import {
  consumeOAuthState,
  exchangeOAuthCode,
  parseAppleUser,
  postAuthRedirectPath,
  resolveOAuthUser,
  type OAuthProvider,
} from "../../../../../lib/oauth";
import { clearQaAuditSession } from "../../../../../lib/qa-audit";
import { readBoundedText } from "../../../../../lib/request-body";

function asProvider(value: string): OAuthProvider | null {
  return value === "google" || value === "apple" ? value : null;
}
function stateCookieName(provider: OAuthProvider) { return `hee_oauth_state_${provider}`; }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function safeAppOrigin(request: Request) {
  if (process.env.VERCEL_ENV === "production") return "https://hee.sa";
  try {
    const origin = new URL(request.url);
    const host = origin.hostname.toLowerCase();
    const allowed = host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host.endsWith(".app.github.dev") || host === "hee.sa" || host === "www.hee.sa";
    return allowed ? origin.origin : "https://hee.sa";
  } catch { return "https://hee.sa"; }
}
function errorRedirect(request: Request, code: string, registration = false) {
  return NextResponse.redirect(new URL(`/${registration ? "register" : "login"}?oauth=${encodeURIComponent(code)}`, safeAppOrigin(request)));
}
function validCallbackValue(value: string, max: number) { return value.length > 0 && value.length <= max; }

async function complete(request: Request, provider: OAuthProvider, input: { state: string; code: string; appleUser?: string | null }) {
  if (!validCallbackValue(input.state, 256) || !validCallbackValue(input.code, 4096) || (input.appleUser && input.appleUser.length > 10_000)) {
    return errorRedirect(request, "invalid-callback");
  }

  const cookieStore = await cookies();
  const browserState = cookieStore.get(stateCookieName(provider))?.value ?? "";
  cookieStore.delete(stateCookieName(provider));
  if (!browserState || browserState.length > 256 || !safeEqual(browserState, input.state)) return errorRedirect(request, "invalid-state");

  let stateRecord;
  try { stateRecord = await consumeOAuthState(provider, input.state); }
  catch { return errorRedirect(request, "invalid-state"); }
  const registration = stateRecord.redirectTo === "/onboarding";

  try {
    const claims = await exchangeOAuthCode(provider, input.code, stateRecord);
    const subject = String(claims.sub ?? "");
    const email = String(claims.email ?? "").trim().toLowerCase();

    if (!registration) {
      const [identity, existingUser] = await Promise.all([
        subject ? db.authIdentity.findUnique({ where: { provider_providerSubject: { provider, providerSubject: subject } }, select: { id: true, user: { select: { deletedAt: true } } } }) : null,
        email ? db.user.findUnique({ where: { email }, select: { id: true, deletedAt: true, passwordHash: true } }) : null,
      ]);
      const activeIdentity = Boolean(identity && !identity.user.deletedAt);
      // A password account has not proven ownership of its registration email. Do not
      // let first-time OAuth login silently attach to it; that could preserve access
      // for an earlier email squatter after the real mailbox owner signs in socially.
      // Already-linked provider identities continue through activeIdentity above.
      const safeEmailOnlyUser = Boolean(existingUser && !existingUser.deletedAt && !existingUser.passwordHash);
      // OAuth is currently login-only. Use a generic failure so this path cannot be
      // used to determine whether an HEE account exists or which credential type it uses.
      if (!activeIdentity && !safeEmailOnlyUser) return errorRedirect(request, "authentication-failed");
    }

    const user = await resolveOAuthUser(provider, claims, provider === "apple" ? parseAppleUser(input.appleUser) : null);
    if (user.deletedAt) return errorRedirect(request, "authentication-failed", registration);

    await clearQaAuditSession();
    await createSession(user.id);
    const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, select: { onboardingCompleted: true, onboardingStep: true, isPublished: true } });
    return NextResponse.redirect(new URL(postAuthRedirectPath(business, "/dashboard"), safeAppOrigin(request)));
  } catch (error) {
    console.error("[oauth-callback] authentication_failed", { provider, error: error instanceof Error ? error.message : "unknown" });
    return errorRedirect(request, "authentication-failed", registration);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider || provider === "apple") return errorRedirect(request, "invalid-callback");
  const { searchParams } = new URL(request.url);
  if (searchParams.get("error")) return errorRedirect(request, "provider-cancelled");
  const state = searchParams.get("state") ?? "";
  const code = searchParams.get("code") ?? "";
  if (!validCallbackValue(state, 256) || !validCallbackValue(code, 4096)) return errorRedirect(request, "missing-callback-data");
  return complete(request, provider, { state, code });
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider || provider !== "apple") return errorRedirect(request, "invalid-callback");

  let rawForm: string;
  try {
    rawForm = await readBoundedText(request, 64 * 1024);
  } catch {
    return errorRedirect(request, "invalid-callback");
  }
  const form = new URLSearchParams(rawForm);
  if (String(form.get("error") ?? "")) return errorRedirect(request, "provider-cancelled");
  const state = String(form.get("state") ?? "");
  const code = String(form.get("code") ?? "");
  const appleUser = String(form.get("user") ?? "") || null;
  if (!validCallbackValue(state, 256) || !validCallbackValue(code, 4096) || (appleUser && appleUser.length > 10_000)) return errorRedirect(request, "missing-callback-data");
  return complete(request, provider, { state, code, appleUser });
}
