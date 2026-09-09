import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../app/login/login-content.tsx", import.meta.url), "utf8");

test("login derives external provider visibility from server configuration", () => {
  assert.match(page, /providerConfigured\("google"\)/);
  assert.match(page, /providerConfigured\("apple"\)/);
  assert.match(page, /googleEnabled=\{providerConfigured\("google"\)\}/);
  assert.match(page, /appleEnabled=\{providerConfigured\("apple"\)\}/);
});

test("configured OAuth providers remain non-prefetched while unavailable providers are omitted", () => {
  assert.match(client, /googleEnabled \? <Link href="\/api\/auth\/oauth\/google" prefetch=\{false\}/);
  assert.match(client, /appleEnabled \? <Link href="\/api\/auth\/oauth\/apple" prefetch=\{false\}/);
  assert.match(client, /const hasExternalProvider = googleEnabled \|\| appleEnabled/);
  assert.match(client, /المتابعة باستخدام Google/);
  assert.match(client, /المتابعة باستخدام Apple/);
});
