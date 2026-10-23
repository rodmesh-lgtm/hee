import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMERA_CHECK_MAX_AGE_MS, liveStationReadiness } from "../app/lib/live-view/readiness";

test("session readiness expires at fifteen minutes and rejects invalid or future checks", () => {
  const now = Date.now();
  const station = { enabled: true, lastOnline: true, lastCheckedAt: new Date(now - 100), connectorId: null };
  assert.equal(liveStationReadiness(station, now).ready, true);
  assert.equal(liveStationReadiness({ ...station, lastCheckedAt: new Date(now - CAMERA_CHECK_MAX_AGE_MS + 1) }, now).ready, true);
  for (const lastCheckedAt of [null, new Date(NaN), new Date(now + 5_001), new Date(now - CAMERA_CHECK_MAX_AGE_MS)]) {
    assert.equal(liveStationReadiness({ ...station, lastCheckedAt }, now).ready, false);
  }
  assert.equal(liveStationReadiness({ ...station, enabled: false }, now).ready, false);
  assert.equal(liveStationReadiness({ ...station, lastOnline: false }, now).ready, false);
});

test("a successful camera check cannot hide a disconnected or revoked site", () => {
  const now = Date.now();
  const connector = { enrolledAt: new Date(now - 10_000), lastSeenAt: new Date(now - 1_000), revokedAt: null };
  const station = { enabled: true, lastOnline: true, lastCheckedAt: new Date(now - 1_000), connectorId: "site-a", connector };
  assert.equal(liveStationReadiness(station, now).ready, true);
  assert.equal(liveStationReadiness({ ...station, connector: null }, now).ready, false);
  assert.equal(liveStationReadiness({ ...station, connector: { ...connector, revokedAt: new Date(now) } }, now).ready, false);
  assert.equal(liveStationReadiness({ ...station, connector: { ...connector, lastSeenAt: new Date(now - 45_000) } }, now).ready, false);
});
