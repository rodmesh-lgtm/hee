import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rateLimit = new URL("../app/lib/rate-limit.ts", import.meta.url);
const retention = new URL("../scripts/prune-expired-operational-data.ts", import.meta.url);

test("rate-limit requests do not start background retention queries", async () => {
  const source = await readFile(rateLimit, "utf8");
  assert.doesNotMatch(source, /pruneExpiredRateLimits/);
  assert.doesNotMatch(source, /void\s+[^;]*prune/i);
  assert.doesNotMatch(source, /DELETE FROM "RequestRateLimit"/);
});

test("expired rate-limit rows remain covered by the controlled retention job", async () => {
  const source = await readFile(retention, "utf8");
  assert.match(source, /DELETE FROM "RequestRateLimit" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'/);
});
