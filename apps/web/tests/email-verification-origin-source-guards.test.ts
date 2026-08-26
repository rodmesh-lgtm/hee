import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/lib/email-verification.ts", import.meta.url), "utf8");

test("preview verification emails stay on the Vercel preview that issued them", () => {
  assert.match(source, /if \(vercelEnv === "preview"\)/);
  assert.match(source, /process\.env\.VERCEL_URL/);
  assert.match(source, /process\.env\.VERCEL_BRANCH_URL/);
  assert.match(source, /trustedVerificationOrigin/);
});

test("production verification emails remain canonical on ir.sa", () => {
  assert.match(source, /vercelEnv === "production"[\s\S]*return "https:\/\/ir\.sa"/);
  assert.doesNotMatch(source, /https:\/\/(?:www\.)?hee\.sa/);
});

test("preview origin selection does not fall through shared production site variables", () => {
  const previewBlock = source.match(/if \(vercelEnv === "preview"\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.doesNotMatch(previewBlock, /NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_APP_URL|AUTH_ORIGIN/);
});
