import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { hubDigest, safeHubPath, sealHubSession, openHubSession } from "../app/lib/customer-hub";

test("hub return paths retain dashboard destinations and reject external URLs", () => {
  assert.equal(safeHubPath("/dashboard?paid=1"), "/?paid=1");
  assert.equal(safeHubPath("/dashboard/settings?tab=account"), "/dashboard/settings?tab=account");
  for (const value of ["//evil.test", "https://evil.test/dashboard", "/\\evil.test", "/login", "/dashboard/../../login", "https://[invalid"]) assert.equal(safeHubPath(value), "/");
});
test("session envelope requires browser challenge and rejects tampering", () => {
  const challenge = hubDigest(randomBytes(32).toString("base64url"));
  const token = randomBytes(32).toString("base64url");
  const envelope = sealHubSession(token, challenge);
  assert.equal(openHubSession(envelope, challenge), token);
  assert.ok(!envelope.includes(token));
  assert.throws(() => openHubSession(envelope, hubDigest("another-browser")));
  const tampered = Buffer.from(envelope, "base64url"); tampered[30] ^= 1;
  assert.throws(() => openHubSession(tampered.toString("base64url"), challenge));
});
function request(path: string, host: string, method = "GET") {
  return new NextRequest(`https://${host}${path}`, { method, headers: { host } });
}
test("hub root rewrites dashboard and keeps public origin root unchanged", () => {
  const response = proxy(request("/", "hub.ir.sa"));
  assert.equal(response.headers.get("x-middleware-rewrite"), "https://hub.ir.sa/dashboard");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.equal(proxy(request("/", "ir.sa")).headers.get("x-middleware-rewrite"), null);
});
test("old dashboard reads move to hub while mutation bodies are never redirected", () => {
  assert.equal(proxy(request("/dashboard", "ir.sa")).headers.get("location"), "https://hub.ir.sa/");
  assert.equal(proxy(request("/dashboard/working-hours?salla=connected", "ir.sa")).headers.get("location"), "https://hub.ir.sa/dashboard/working-hours?salla=connected");
  assert.equal(proxy(request("/dashboard/settings", "ir.sa", "POST")).headers.get("location"), null);
});
test("hub authentication starts a browser-bound bridge and admin stays isolated", () => {
  assert.equal(proxy(request("/login", "hub.ir.sa")).headers.get("location"), "https://hub.ir.sa/api/auth/hub/start");
  assert.equal(proxy(request("/admin", "hub.ir.sa")).status, 404);
  assert.equal(proxy(request("/api/auth/hub/complete", "admin.ir.sa")).status, 404);
});
