import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("Google callback is GET while Apple form_post callback is POST", () => {
  assert.match(oauth, /response_mode: "form_post"/);
  assert.match(callback, /export async function GET/);
  assert.match(callback, /provider === "apple"/);
  assert.match(callback, /export async function POST/);
  assert.match(callback, /provider !== "apple"/);
  assert.match(callback, /readBoundedText\(request, 64 \* 1024\)/);
});

test("production OAuth callback origin is pinned to canonical HEE origin", () => {
  assert.match(oauth, /if \(process\.env\.VERCEL_ENV === "production"\) return "https:\/\/ir\.sa"/);
  assert.match(oauth, /return `\$\{oauthOrigin\(\)\}\/api\/auth\/oauth\/\$\{provider\}\/callback`/);
});
