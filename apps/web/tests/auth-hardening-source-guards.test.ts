import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("login performs password verification even when an account is missing", () => {
  const auth = source("app/actions/auth.ts");
  assert.match(auth, /DUMMY_PASSWORD_HASH/);
  assert.match(auth, /verifyPassword\(parsed\.data\.password,\s*user\?\.passwordHash\s*\?\?\s*DUMMY_PASSWORD_HASH\)/);
});

test("registration does not expose whether an email already exists", () => {
  const auth = source("app/actions/auth.ts");
  assert.doesNotMatch(auth, /هذا البريد موجود مسبقاً/);
  assert.match(auth, /GENERIC_REGISTRATION_ERROR/);
});

test("registration automatically starts mailbox verification but keeps a recoverable onboarding path if delivery fails", () => {
  const auth = source("app/actions/auth.ts");
  const onboarding = source("app/onboarding/page.tsx");
  const verification = source("app/lib/email-verification.ts");

  const sessionIndex = auth.indexOf("await createSession(user.id)");
  const verificationIndex = auth.indexOf("issueEmailVerification(user.id, parsed.data.email)");
  assert.ok(sessionIndex >= 0 && verificationIndex > sessionIndex, "registration should establish the account/session before best-effort email delivery");
  assert.match(auth, /verification-sent/);
  assert.match(auth, /verification-send-failed/);
  assert.match(auth, /verification-unavailable/);
  assert.match(onboarding, /أرسلنا رابط تأكيد البريد تلقائيًا/);
  assert.match(onboarding, /تم إنشاء حسابك بنجاح، لكن تعذر إرسال رسالة تأكيد البريد الآن/);
  assert.match(verification, /if \(!sent\) \{/);
  assert.match(verification, /oAuthState\.deleteMany/);
  assert.match(verification, /return "send-failed" as const/);
});

test("oauth login failures do not expose account existence", () => {
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.doesNotMatch(callback, /account-not-found/);
});

test("first-time OAuth login links only an independently verified local password account", () => {
  const oauth = source("app/lib/oauth.ts");
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(oauth, /function assertOauthEmailAutoLinkSafe/);
  assert.match(oauth, /passwordHash\?: string \| null; emailVerifiedAt\?: Date \| null/);
  assert.match(oauth, /if \(user\?\.passwordHash && !user\.emailVerifiedAt\) throw new Error\("oauth-password-account-link-required"\)/);
  assert.match(oauth, /assertOauthEmailAutoLinkSafe\(existingUser\)/);
  assert.match(oauth, /assertOauthEmailAutoLinkSafe\(activeUser\)/);
  assert.match(callback, /passwordHash: true, emailVerifiedAt: true/);
  assert.match(callback, /safeExistingUser/);
  assert.match(callback, /!existingUser\.passwordHash \|\| existingUser\.emailVerifiedAt/);
  assert.match(callback, /if \(!activeIdentity && !safeExistingUser\) return errorRedirect\(request, "authentication-failed"\)/);
});

test("production OAuth redirect_uri is pinned to the canonical HEE origin", () => {
  const oauth = source("app/lib/oauth.ts");
  assert.match(oauth, /if \(process\.env\.VERCEL_ENV === "production"\) return "https:\/\/hee\.sa"/);
  assert.match(oauth, /return `\$\{oauthOrigin\(\)\}\/api\/auth\/oauth\/\$\{provider\}\/callback`/);
});

test("password reset links are canonical in production but preview-safe", () => {
  const reset = source("app/actions/password-reset.ts");
  assert.match(reset, /const vercelEnv = String\(process\.env\.VERCEL_ENV \?\? ""\)\.toLowerCase\(\)/);
  assert.match(reset, /vercelEnv === "production" \|\| \(!vercelEnv && process\.env\.NODE_ENV === "production"\)/);
  assert.match(reset, /if \(vercelEnv === "preview"\)/);
  assert.match(reset, /process\.env\.VERCEL_URL/);
  assert.match(reset, /process\.env\.VERCEL_BRANCH_URL/);
  assert.match(reset, /hostname === suffix \|\| hostname\.endsWith\(`\.\$\{suffix\}`\)/);
  assert.match(reset, /trustedResetOrigin\(String\(process\.env\.VERCEL_URL \?\? ""\), \["vercel\.app"\]\)/);
  assert.match(reset, /return "https:\/\/hee\.sa"/);
});

test("real runtimes do not authenticate plaintext legacy database sessions", () => {
  const auth = source("app/lib/auth.ts");
  const runtime = source("app/lib/runtime-environment.ts");
  assert.match(auth, /import \{ isExplicitTestRuntime \} from "\.\/runtime-environment"/);
  assert.match(auth, /function allowLegacyPlaintextSessions\(\) \{ return isExplicitTestRuntime\(\); \}/);
  assert.match(runtime, /appEnvironment\(\) === "test" && vercelEnvironment\(\) !== "production"/);
  assert.match(auth, /if \(!session && allowLegacyPlaintextSessions\(\)\)/);
  assert.match(auth, /NORMAL_SESSION_STORAGE_PREFIX/);
  assert.match(auth, /secure:\s*true/);
  assert.match(auth, /SESSION_COOKIE = "__Host-hee_session"/);
});

test("sensitive owner and token pages are private no-store, noindex, and no-referrer", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /pathname\.startsWith\("\/dashboard"\)/);
  assert.match(proxy, /pathname\.startsWith\("\/admin"\)/);
  assert.match(proxy, /pathname === "\/verify-email"/);
  assert.match(proxy, /pathname === "\/reset-password"/);
  assert.match(proxy, /Cache-Control", "private, no-store, max-age=0"/);
  assert.match(proxy, /X-Robots-Tag", "noindex, nofollow"/);
  assert.match(proxy, /Referrer-Policy", "no-referrer"/);
});

test("JSON write endpoints enforce streaming body limits before parsing", () => {
  const helper = source("app/lib/request-body.ts");
  assert.match(helper, /total > limit/);
  assert.match(helper, /RequestBodyTooLargeError/);
  assert.match(helper, /readBoundedText/);
  for (const path of [
    "app/api/public/orders/route.ts",
    "app/api/public/bookings/route.ts",
    "app/api/public/analytics/route.ts",
    "app/api/business/create/route.ts",
    "app/api/dashboard/business/autosave/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /readBoundedJson\(/, `${path} must use the bounded JSON reader`);
    assert.doesNotMatch(route, /request\.json\(\)/, `${path} must not bypass the bounded JSON reader`);
  }
});

test("Apple OAuth form_post is bounded before form parsing", () => {
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(callback, /readBoundedText\(request, 64 \* 1024\)/);
  assert.match(callback, /new URLSearchParams\(rawForm\)/);
  assert.doesNotMatch(callback, /request\.formData\(\)/);
});