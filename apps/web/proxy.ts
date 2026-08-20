import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isSensitivePrivatePath(pathname: string) {
  return pathname.startsWith("/dashboard")
    || pathname.startsWith("/admin")
    || pathname === "/login"
    || pathname === "/register"
    || pathname === "/forgot-password"
    || pathname === "/reset-password"
    || pathname === "/onboarding"
    || pathname === "/preview";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreview = process.env.VERCEL_ENV?.toLowerCase() === "preview";
  const hasQaAuditSession = Boolean(request.cookies.get("hee_qa_audit")?.value);
  const isQaPath = pathname.startsWith("/qa/");
  const sensitivePrivatePath = isSensitivePrivatePath(pathname);
  const shouldMarkNoindex = isQaPath || sensitivePrivatePath || (isPreview && hasQaAuditSession && pathname.startsWith("/dashboard"));

  const response = NextResponse.next();
  if (shouldMarkNoindex) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (isQaPath || sensitivePrivatePath) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export const config = {
  matcher: [
    "/qa/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/preview",
  ],
};
