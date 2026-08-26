import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const start = readFileSync(new URL("../app/api/auth/oauth/[provider]/route.ts", import.meta.url), "utf8");
const register = readFileSync(new URL("../app/register/page.tsx", import.meta.url), "utf8");

test("social registration cannot bypass explicit legal consent", () => {
  assert.match(register, /name="agreed"/);
  assert.match(register, /href="\/terms"/);
  assert.match(register, /href="\/privacy"/);
  assert.match(start, /searchParams\.get\("mode"\) === "register"/);
  assert.match(start, /\/register\?oauth=consent-required/);
});
