import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("deleted HEE accounts cannot regain access through OAuth", () => {
  assert.match(oauth, /if \(!user \|\| user\.deletedAt\) throw new Error\("oauth-account-unavailable"\)/);
  assert.match(callback, /if \(user\.deletedAt\) return errorRedirect/);
});
