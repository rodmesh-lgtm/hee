import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWhatsAppCampaignLaunchReadiness, WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS } from "../app/lib/whatsapp/campaign-launch-readiness";

function databaseDouble(input: { currentTime?: Date; lastSucceededAt?: Date | null; lastErrorCode?: string | null; releaseSha?: string | null }) {
  return {
    whatsAppOperationsHeartbeat: {
      async findUnique() {
        if (input.lastSucceededAt === undefined && input.lastErrorCode === undefined && input.releaseSha === undefined) return null;
        return {
          lastSucceededAt: input.lastSucceededAt ?? null,
          lastErrorCode: input.lastErrorCode ?? null,
          releaseSha: input.releaseSha ?? null,
        };
      },
    },
    async $queryRaw() {
      return input.currentTime ? [{ currentTime: input.currentTime }] : [];
    },
  };
}

test("campaign launch readiness requires a fresh successful operations heartbeat", async () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const lastSucceededAt = new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS + 1_000);
  const result = await getWhatsAppCampaignLaunchReadiness({
    database: databaseDouble({ currentTime, lastSucceededAt, releaseSha: "a".repeat(40) }) as never,
  });
  assert.equal(result.ready, true);
  if (result.ready) {
    assert.equal(result.lastSucceededAt.toISOString(), lastSucceededAt.toISOString());
    assert.equal(result.releaseSha, "a".repeat(40));
  }
});

test("campaign launch readiness fails closed when worker has never succeeded", async () => {
  const result = await getWhatsAppCampaignLaunchReadiness({
    database: databaseDouble({ currentTime: new Date("2026-08-31T10:00:00Z"), lastSucceededAt: null }) as never,
  });
  assert.deepEqual(result, { ready: false, code: "worker_not_started" });
});

test("campaign launch readiness fails closed on the latest worker error", async () => {
  const result = await getWhatsAppCampaignLaunchReadiness({
    database: databaseDouble({ currentTime: new Date("2026-08-31T10:00:00Z"), lastSucceededAt: new Date("2026-08-31T09:59:00Z"), lastErrorCode: "WHATSAPP_DELIVERIES_FAILED" }) as never,
  });
  assert.deepEqual(result, { ready: false, code: "worker_failed" });
});

test("campaign launch readiness rejects stale or implausibly future heartbeats", async () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const stale = await getWhatsAppCampaignLaunchReadiness({
    database: databaseDouble({ currentTime, lastSucceededAt: new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS) }) as never,
  });
  const future = await getWhatsAppCampaignLaunchReadiness({
    database: databaseDouble({ currentTime, lastSucceededAt: new Date(currentTime.getTime() + 61_000) }) as never,
  });
  assert.deepEqual(stale, { ready: false, code: "worker_stale" });
  assert.deepEqual(future, { ready: false, code: "worker_stale" });
});

test("campaign launch readiness fails closed when database time cannot be proven", async () => {
  const result = await getWhatsAppCampaignLaunchReadiness({ database: databaseDouble({ lastSucceededAt: new Date() }) as never });
  assert.deepEqual(result, { ready: false, code: "database_clock_unavailable" });
});

test("campaign launch action proves worker readiness before enqueuing and UI disables unsafe launch", () => {
  const action = readFileSync(new URL("../app/actions/whatsapp-campaign-launch.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  const readinessIndex = action.indexOf("getWhatsAppCampaignLaunchReadiness()");
  const enqueueIndex = action.indexOf("enqueueWhatsAppCampaign(");
  assert.ok(readinessIndex >= 0 && enqueueIndex > readinessIndex, "launch action must prove operations readiness before enqueue");
  assert.match(action, /campaign\.launch\.blocked/);
  assert.match(page, /launchWhatsAppCampaignAction/);
  assert.match(page, /disabled=!\{?launchReady\}?|disabled=\{!launchReady\}/);
  assert.match(page, /الإطلاق الفوري مقفل مؤقتًا/);
});
