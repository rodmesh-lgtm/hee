import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const start = readFileSync(new URL("../app/api/auth/oauth/[provider]/route.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("OAuth HTTP redirects use an allowlisted app origin", () => {
  for (const source of [start, callback]) {
    assert.match(source, /host === "localhost"/);
    assert.match(source, /host\.endsWith\("\.vercel\.app"\)/);
    assert.match(source, /host === "hee\.sa"/);
    assert.match(source, /return allowed \? origin\.origin : "https:\/\/hee\.sa"/);
  }
});
