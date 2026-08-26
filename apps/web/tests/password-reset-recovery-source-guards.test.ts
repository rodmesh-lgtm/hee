import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reset = readFileSync(new URL("../app/actions/password-reset.ts", import.meta.url), "utf8");

test("password reset requests do not reveal existing accounts when email delivery fails", () => {
  assert.match(reset, /GENERIC_RESET_MESSAGE/);
  assert.match(reset, /if \(!user\?\.passwordHash \|\| user\.deletedAt\) return \{ success: GENERIC_RESET_MESSAGE \}/);
  assert.match(reset, /reset email was not accepted by provider/);
  assert.doesNotMatch(reset, /return \{ error: "تعذر إرسال رسالة الاستعادة الآن/);
});

test("password reset tokens are random, hashed at rest, short-lived and single-use", () => {
  assert.match(reset, /randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(reset, /createHash\("sha256"\)/);
  assert.match(reset, /RESET_TTL_MS = 30 \* 60 \* 1000/);
  assert.match(reset, /pg_advisory_xact_lock/);
  assert.match(reset, /consumed\.count !== 1/);
});

test("successful password reset revokes existing sessions and stale ownership tokens", () => {
  assert.match(reset, /tx\.session\.deleteMany\(\{ where: \{ userId: user\.id \} \}\)/);
  assert.match(reset, /provider: PROVIDER, nonce: user\.id/);
  assert.match(reset, /provider: "email-verification", nonce: user\.id/);
  assert.match(reset, /emailVerifiedAt: new Date\(\)/);
});

test("password reset links use a trusted environment-specific origin and provider calls are bounded", () => {
  assert.match(reset, /vercelEnv === "production"[\s\S]*return "https:\/\/ir\.sa"/);
  assert.match(reset, /vercelEnv === "preview"/);
  assert.match(reset, /process\.env\.VERCEL_URL/);
  assert.match(reset, /process\.env\.VERCEL_BRANCH_URL/);
  assert.match(reset, /\["vercel\.app"\]/);
  assert.match(reset, /url\.username \|\| url\.password \|\| url\.pathname !== "\/" \|\| url\.search \|\| url\.hash/);
  assert.match(reset, /if \(!apiKey \|\| !from \|\| !origin\)/);
  assert.match(reset, /AbortSignal\.timeout\(10_000\)/);
  assert.match(reset, /cache: "no-store"/);
});
