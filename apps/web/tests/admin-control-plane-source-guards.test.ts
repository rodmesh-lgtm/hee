import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

test("admin control plane uses its own cookie and hashed session namespace", () => {
  const admin = source("app/lib/admin.ts");
  assert.match(admin, /__Host-hee_admin_session/);
  assert.match(admin, /hee_admin_session_sha256:/);
  assert.match(admin, /sameSite: "strict"/);
  assert.match(admin, /ADMIN_SESSION_TTL_MS = 1000 \* 60 \* 60 \* 8/);
  assert.match(admin, /getCurrentAdminUser/);
  assert.match(admin, /isExplicitTestRuntime\(\)/);
});

test("admin login has a dedicated action and does not create a customer session", () => {
  const action = source("app/actions/admin-auth.ts");
  assert.match(action, /adminLoginAction/);
  assert.match(action, /createAdminSession/);
  assert.match(action, /isAdminEmail/);
  assert.match(action, /emailVerifiedAt/);
  assert.match(action, /admin-login-ip/);
  assert.doesNotMatch(action, /createSession\(/);
});

test("production customer hostname redirects admin routes to the control-plane origin", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /https:\/\/admin\.hee\.sa/);
  assert.match(proxy, /productionMainHost/);
  assert.match(proxy, /pathname === "\/admin"/);
  assert.match(proxy, /NextResponse\.redirect/);
  assert.match(proxy, /pathname === "\/login"/);
  assert.match(proxy, /url\.pathname = "\/admin-login"/);
});

test("production admin origin cannot be redirected to an arbitrary configured host", () => {
  const admin = source("app/lib/admin.ts");
  assert.match(admin, /isProductionRuntime/);
  assert.match(admin, /const productionOrigin = "https:\/\/admin\.hee\.sa"/);
  assert.match(admin, /if \(isProductionRuntime\(\)\) return productionOrigin/);
});

test("admin hostname is deny-by-default and cannot serve customer or public API surfaces", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /adminControlPlaneNotFoundResponse/);
  assert.match(proxy, /pathname === "\/admin-login" \|\| pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)/);
  assert.match(proxy, /return adminControlPlaneNotFoundResponse\(\)/);
  assert.equal(proxy.includes('pathname.startsWith("/dashboard") || pathname === "/register" || pathname === "/onboarding"'), false);
});
