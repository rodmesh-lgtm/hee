import { NextResponse } from "next/server";
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

function asProvider(value: string): OAuthProvider | null {
  return value === "google" || value === "apple" ? value : null;
}

function errorRedirect(request: Request, code: string, registration = false) {
  return NextResponse.redirect(new URL(`/${registration ? "register" : "login"}?oauth=${encodeURIComponent(code)}`, request.url));
}

async function complete(request: Request, provider: OAuthProvider, input: { state: string; code: string; appleUser?: string | null }) {
  let stateRecord;
  try {
    stateRecord = await consumeOAuthState(provider, input.state);
  } catch {
    return errorRedirect(request, "invalid-state");
  }

  const registration = stateRecord.redirectTo === "/onboarding";

  try {
    const claims = await exchangeOAuthCode(provider, input.code, stateRecord);
    const subject = String(claims.sub ?? "");
    const email = String(claims.email ?? "").trim().toLowerCase();

    if (!registration) {
      const [identity, existingUser] = await Promise.all([
        subject ? db.authIdentity.findUnique({ where: { provider_providerSubject: { provider, providerSubject: subject } }, select: { id: true } }) : null,
        email ? db.user.findUnique({ where: { email }, select: { id: true } }) : null,
      ]);
      if (!identity && !existingUser) return errorRedirect(request, "account-not-found");
    }

    const user = await resolveOAuthUser(provider, claims, provider === "apple" ? parseAppleUser(input.appleUser) : null);
    await clearQaAuditSession();
    await createSession(user.id);

    const business = await db.business.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      select: { onboardingCompleted: true, onboardingStep: true, isPublished: true },
    });
    return NextResponse.redirect(new URL(postAuthRedirectPath(business, "/dashboard"), request.url));
  } catch {
    return errorRedirect(request, "authentication-failed", registration);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider || provider === "apple") return errorRedirect(request, "invalid-callback");
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) return errorRedirect(request, "provider-cancelled");
  const state = searchParams.get("state") ?? "";
  const code = searchParams.get("code") ?? "";
  if (!state || !code) return errorRedirect(request, "missing-callback-data");
  return complete(request, provider, { state, code });
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider || provider !== "apple") return errorRedirect(request, "invalid-callback");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorRedirect(request, "invalid-callback");
  }
  if (String(form.get("error") ?? "")) return errorRedirect(request, "provider-cancelled");
  const state = String(form.get("state") ?? "");
  const code = String(form.get("code") ?? "");
  const appleUser = String(form.get("user") ?? "") || null;
  if (!state || !code) return errorRedirect(request, "missing-callback-data");
  return complete(request, provider, { state, code, appleUser });
}
