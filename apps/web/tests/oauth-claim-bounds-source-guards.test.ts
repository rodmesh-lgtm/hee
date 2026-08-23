import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("OAuth bounds untrusted token and callback inputs", () => {
  assert.match(oauth, /token\.length > 20_000/);
  assert.match(oauth, /code\.length > 4096/);
  assert.match(oauth, /email\.length > 254/);
  assert.match(callback, /validCallbackValue\(input\.state, 256\)/);
  assert.match(callback, /validCallbackValue\(input\.code, 4096\)/);
  assert.match(callback, /input\.appleUser\.length > 10_000/);
});
