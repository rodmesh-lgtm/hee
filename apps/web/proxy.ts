import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isSensitivePrivatePath(pathname: string) {
  return pathname.startsWith("/dashboard")
    || pathname.startsWith("/admin")
    || pathname === "/login"
    || pathname === "/register"
    || pathname === "/forgot-password"
    || pathname === "/reset-password"
    || pathname === "/verify-email"
    || pathname === "/onboarding"
    || pathname === "/preview";
}

function isProduction() {
  const appEnv = String(process.env.APP_ENV ?? "").trim().toLowerCase();
  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  return appEnv === "production" || vercelEnv === "production";
}

function productionMaintenanceEnabled() {
  return isProduction()
    && String(process.env.PRODUCTION_MAINTENANCE_MODE ?? "").trim().toLowerCase() === "true";
}

function isMaintenanceControlRead(request: NextRequest, pathname: string) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return pathname === "/api/release" || pathname === "/api/maintenance/status";
}

function configuredOrigin(name: "admin" | "main") {
  const raw = name === "admin" ? process.env.HEE_ADMIN_ORIGIN : process.env.APP_URL;
  const fallback = name === "admin" ? "https://admin.hee.sa" : "https://hee.sa";
  try {
    const value = String(raw ?? "").trim();
    if (!value) return fallback;
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || !url.hostname) return fallback;
    if (name === "admin" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

function requestHostname(request: NextRequest) {
  return String(request.headers.get("host") ?? "").split(":")[0]?.trim().toLowerCase();
}

function isAdminControlHost(request: NextRequest) {
  return requestHostname(request) === new URL(configuredOrigin("admin")).hostname.toLowerCase();
}

function adminControlPlaneNotFoundResponse() {
  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function maintenanceResponse() {
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>HEE — صيانة مجدولة</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f8;color:#171717;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}.card{width:min(620px,100%);background:#fff;border:1px solid #e6e6e8;border-radius:24px;padding:40px;box-shadow:0 18px 60px rgba(0,0,0,.07);text-align:center}.mark{display:inline-grid;place-items:center;width:58px;height:58px;border-radius:18px;background:#171717;color:#fff;font-weight:800;font-size:22px;margin-bottom:22px}.title{font-size:28px;font-weight:800;margin:0 0 12px}.copy{font-size:17px;line-height:1.9;color:#5b5b63;margin:0}.note{margin-top:24px;padding-top:20px;border-top:1px solid #ededf0;color:#7a7a82;font-size:14px;line-height:1.8}</style>
</head>
<body><main class="card"><div class="mark">HEE</div><h1 class="title">نجري صيانة مجدولة</h1><p class="copy">تم إيقاف العمليات مؤقتًا لحماية البيانات أثناء التحديث. ستعود الخدمة بعد اكتمال التحقق الآمن.</p><p class="note">لا يلزم اتخاذ أي إجراء من جانبك. لم يتم حذف بياناتك أو تغييرها بسبب صفحة الصيانة.</p></main></body>
</html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Retry-After": "300",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function productionQaNotFoundResponse() {
  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function withPrivateHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminHost = isAdminControlHost(request);
  const host = requestHostname(request);
  const productionMainHost = host === "hee.sa" || host === "www.hee.sa";

  // admin.hee.sa is a deny-by-default control plane, not an alternate customer
  // hostname. Only the audited administration tree and its login entry are served
  // here. This keeps customer pages, auth recovery flows and public/customer APIs
  // outside the operator origin even though both planes currently share a deployment.
  if (adminHost) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return withPrivateHeaders(NextResponse.rewrite(url));
    }
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      return withPrivateHeaders(NextResponse.rewrite(url));
    }
    if (pathname === "/admin-login" || pathname === "/admin" || pathname.startsWith("/admin/")) {
      return withPrivateHeaders(NextResponse.next());
    }
    return adminControlPlaneNotFoundResponse();
  }

  // Keep the operator control plane reachable while the customer plane is deliberately
  // in maintenance mode, so operators can inspect and recover the platform.
  if (productionMaintenanceEnabled() && !isMaintenanceControlRead(request, pathname)) {
    return maintenanceResponse();
  }

  const isQaPath = pathname === "/qa" || pathname.startsWith("/qa/");
  if (isProduction() && isQaPath) return productionQaNotFoundResponse();

  // hee.sa itself no longer serves central administration. Localhost/CI are exempt so
  // regression tests can still exercise internal routes without DNS dependencies.
  if (productionMainHost && (pathname === "/admin-login" || pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const targetPath = pathname === "/admin-login" ? "/login" : pathname === "/admin" ? "/" : pathname;
    return NextResponse.redirect(new URL(targetPath, configuredOrigin("admin")));
  }

  const isPreview = process.env.VERCEL_ENV?.toLowerCase() === "preview";
  const hasQaAuditSession = Boolean(request.cookies.get("hee_qa_audit")?.value);
  const sensitivePrivatePath = isSensitivePrivatePath(pathname);
  const shouldMarkNoindex = isQaPath || sensitivePrivatePath || (isPreview && hasQaAuditSession && pathname.startsWith("/dashboard"));

  const response = NextResponse.next();
  if (shouldMarkNoindex) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (isQaPath || sensitivePrivatePath) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};