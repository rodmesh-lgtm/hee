import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");

test("login keeps Google and Apple entry points visible and non-prefetched", () => {
  assert.match(login, /href="\/api\/auth\/oauth\/google" prefetch=\{false\}/);
  assert.match(login, /المتابعة باستخدام Google/);
  assert.match(login, /href="\/api\/auth\/oauth\/apple" prefetch=\{false\}/);
  assert.match(login, /المتابعة باستخدام Apple/);
});
