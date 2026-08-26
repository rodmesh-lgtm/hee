import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("Apple client secret is short-lived ES256 and scoped to Apple issuer and Services ID", () => {
  assert.match(oauth, /alg: "ES256"/);
  assert.match(oauth, /exp: now \+ 5 \* 60/);
  assert.match(oauth, /aud: APPLE_ISSUER/);
  assert.match(oauth, /sub: clientId/);
  assert.match(oauth, /dsaEncoding: "ieee-p1363"/);
});
