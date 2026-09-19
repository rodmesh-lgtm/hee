import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registerPage = new URL("../app/register/page.tsx", import.meta.url);
const registerContent = new URL("../app/register/register-content.tsx", import.meta.url);
const loginPage = new URL("../app/login/page.tsx", import.meta.url);
const loginContent = new URL("../app/login/login-content.tsx", import.meta.url);

const normalize = (value: string) => value.replace(/\s+/g, " ");

test("registration exposes the approved launch providers only", async () => {
  const [page, source] = await Promise.all([
    readFile(registerPage, "utf8").then(normalize),
    readFile(registerContent, "utf8").then(normalize),
  ]);
  assert.match(page, /providerConfigured\("google"\)/);
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(source, /\/api\/auth\/oauth\/google\?mode=register&consent=accepted/);
  assert.match(source, /المتابعة باستخدام Google/);
  assert.match(source, /googleEnabled \? <div/);
  assert.equal(source.includes("AppleMark"), false);
  assert.equal(source.includes('socialHref("apple")'), false);
  assert.equal(source.includes("المتابعة باستخدام Apple"), false);
});

test("login keeps external providers configuration-gated", async () => {
  const [page, content] = await Promise.all([
    readFile(loginPage, "utf8").then(normalize),
    readFile(loginContent, "utf8").then(normalize),
  ]);
  assert.match(page, /providerConfigured\("google"\)/);
  assert.match(page, /providerConfigured\("apple"\)/);
  assert.match(content, /googleEnabled \? <Link/);
  assert.match(content, /appleEnabled \? <Link/);
});
