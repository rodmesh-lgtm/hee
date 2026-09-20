import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

function request(path: string, method = "GET") {
  return new NextRequest(`https://admin.ir.sa${path}`, { method, headers: { host: "admin.ir.sa" } });
}

test("admin host serves the exact approved symbol for reads including deployment query", () => {
  for (const method of ["GET", "HEAD"]) {
    const response = proxy(request("/brand/infro-symbol-approved.png?dpl=deployment", method));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  }
});

test("admin host still denies asset writes, other assets and customer surfaces", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(proxy(request("/brand/infro-symbol-approved.png", method)).status, 404);
  for (const path of ["/brand/other.png", "/brand/infro-symbol-approved.png/extra", "/dashboard", "/register", "/api/public/bookings", "/api/cron/whatsapp-operations"]) {
    assert.equal(proxy(request(path)).status, 404);
  }
});
