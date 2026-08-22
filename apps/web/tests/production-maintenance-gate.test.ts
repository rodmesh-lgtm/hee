import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { GET as maintenanceStatus } from "../app/api/maintenance/status/route";

async function withEnvironment(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production maintenance blocks customer UI and mutating API requests with 503", async () => {
  await withEnvironment({ APP_ENV: "production", PRODUCTION_MAINTENANCE_MODE: "true" }, async () => {
    const page = proxy(new NextRequest("https://hee.sa/register"));
    assert.equal(page.status, 503);
    assert.equal(page.headers.get("retry-after"), "300");
    assert.match(await page.text(), /صيانة مجدولة/);

    const write = proxy(new NextRequest("https://hee.sa/api/public/orders", { method: "POST", body: "{}" }));
    assert.equal(write.status, 503);
    assert.match(await write.text(), /صيانة مجدولة/);
  });
});

test("maintenance control endpoints are read-only exceptions", async () => {
  await withEnvironment({ APP_ENV: "production", PRODUCTION_MAINTENANCE_MODE: "true" }, async () => {
    const statusRead = proxy(new NextRequest("https://hee.sa/api/maintenance/status"));
    assert.equal(statusRead.status, 200);
    assert.equal(statusRead.headers.get("x-middleware-next"), "1");

    const releaseRead = proxy(new NextRequest("https://hee.sa/api/release", { method: "HEAD" }));
    assert.equal(releaseRead.status, 200);
    assert.equal(releaseRead.headers.get("x-middleware-next"), "1");

    const statusWrite = proxy(new NextRequest("https://hee.sa/api/maintenance/status", { method: "POST" }));
    assert.equal(statusWrite.status, 503);
  });
});

test("maintenance mode never activates outside production", async () => {
  await withEnvironment({ APP_ENV: "test", PRODUCTION_MAINTENANCE_MODE: "true" }, async () => {
    const response = proxy(new NextRequest("https://hee.sa/register"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  });
});

test("maintenance status reports exact deployment state without caching", async () => {
  const sha = "a".repeat(40);
  await withEnvironment({ APP_ENV: "production", PRODUCTION_MAINTENANCE_MODE: "true", RELEASE_SHA: sha, VERCEL_GIT_COMMIT_SHA: undefined }, async () => {
    const response = await maintenanceStatus();
    assert.equal(response.status, 200);
    assert.match(String(response.headers.get("cache-control")), /no-store/);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
    assert.deepEqual(await response.json(), {
      service: "hee-web",
      maintenance: true,
      releaseSha: sha,
      environment: "production",
    });
  });
});
