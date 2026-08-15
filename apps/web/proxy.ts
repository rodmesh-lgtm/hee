import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasQaFixtureSecret(request: NextRequest) {
  const expected = process.env.QA_AUDIT_SECRET?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const queryToken = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  return bearerToken === expected || queryToken === expected;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreview = process.env.VERCEL_ENV?.toLowerCase() === "preview";

  if (pathname === "/api/qa/public-fixtures") {
    if (!isPreview || request.method !== "POST" || !hasQaFixtureSecret(request)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const hasQaAuditSession = Boolean(request.cookies.get("hee_qa_audit")?.value);
  const shouldMarkNoindex = pathname.startsWith("/qa/") || (isPreview && hasQaAuditSession && pathname.startsWith("/dashboard"));

  if (shouldMarkNoindex) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/qa/:path*", "/dashboard/:path*", "/api/qa/public-fixtures"],
};
