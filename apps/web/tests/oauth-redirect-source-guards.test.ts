import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("OAuth post-auth redirect accepts only local absolute paths", () => {
  assert.match(oauth, /path\.startsWith\("\/"\)/);
  assert.match(oauth, /!path\.startsWith\("\/\/"\)/);
  assert.match(oauth, /!path\.includes\("\\\\"\)/);
  assert.match(oauth, /\? path : "\/dashboard"/);
});
