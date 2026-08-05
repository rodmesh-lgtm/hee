import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreview = process.env.VERCEL_ENV?.toLowerCase() === "preview";
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
  matcher: ["/qa/:path*", "/dashboard/:path*"],
};
