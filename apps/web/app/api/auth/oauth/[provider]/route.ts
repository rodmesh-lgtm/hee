import { NextResponse } from "next/server";
import { createOAuthAuthorization, type OAuthProvider } from "../../../../lib/oauth";

function asProvider(value: string): OAuthProvider | null {
  return value === "google" || value === "apple" ? value : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = asProvider(rawProvider);
  if (!provider) return NextResponse.redirect(new URL("/login?oauth=unsupported-provider", request.url));

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const redirectTo = mode === "register" ? "/onboarding" : "/dashboard";

  try {
    const authorizationUrl = await createOAuthAuthorization(provider, redirectTo);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const code = error instanceof Error && error.message === "provider-not-configured" ? "provider-unavailable" : "start-failed";
    return NextResponse.redirect(new URL(`/${mode === "register" ? "register" : "login"}?oauth=${code}`, request.url));
  }
}
