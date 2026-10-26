import assert from "node:assert/strict";
import test from "node:test";
import { parseSallaUninstall, sallaLifecycleDate, sallaUninstallIsStale } from "../app/lib/commerce/salla-lifecycle-domain";
const now = new Date("2026-10-26T10:00:00Z");
const payload = { event: "app.uninstalled", merchant: 123, data: { id: 1849074620, uninstallation_date: "2026-10-26T09:59:00Z" } };

test("uninstall requires the correct app and a valid provider instant", () => {
  assert.equal(parseSallaUninstall(payload, "1849074620", now, 180).uninstalledAt.toISOString(), "2026-10-26T09:59:00.000Z");
  assert.throws(() => parseSallaUninstall(payload, "other-app", now, 180), /SALLA_UNINSTALL_APP_MISMATCH/);
  assert.throws(() => parseSallaUninstall({ ...payload, data: { ...payload.data, uninstallation_date: "2026-10-26T11:00:00Z" } }, "1849074620", now, 180), /SALLA_UNINSTALL_DATE_INVALID/);
});

test("legacy timestamps use a configured offset independent of server timezone", () => {
  assert.equal(sallaLifecycleDate("2026-10-26 12:59:00", 180)?.toISOString(), "2026-10-26T09:59:00.000Z");
  assert.equal(sallaLifecycleDate("2026-10-26 12:59:00", 0)?.toISOString(), "2026-10-26T12:59:00.000Z");
  assert.equal(sallaLifecycleDate("2026-10-26T12:59:00+03:00", 0)?.toISOString(), "2026-10-26T09:59:00.000Z");
  for (const date of [null, "2026-02-30 12:00:00", "2026-13-01 12:00:00", "2026-10-26 25:00:00", "2026-10-26", "garbage"]) assert.equal(sallaLifecycleDate(date, 180), null);
});

test("old uninstalls cannot sever a later completed connection", () => {
  assert.equal(sallaUninstallIsStale(new Date("2026-10-26T09:59:00Z"), now), true);
  assert.equal(sallaUninstallIsStale(now, new Date("2026-10-26T09:59:00Z")), false);
  assert.equal(sallaUninstallIsStale(now, new Date("2026-10-26T10:00:00.600Z")), true);
  assert.equal(sallaUninstallIsStale(now, null), false);
});
