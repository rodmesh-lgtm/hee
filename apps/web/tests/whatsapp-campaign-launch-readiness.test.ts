import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateWhatsAppCampaignLaunchReadiness,
  WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS,
} from "../app/lib/whatsapp/campaign-launch-readiness-domain";

test("campaign launch readiness requires a fresh successful operations heartbeat", () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const lastSucceededAt = new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS + 1_000);
  const result = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime,
    heartbeat: { lastSucceededAt, lastErrorCode: null, releaseSha: "a".repeat(40) },
  });
  assert.equal(result.ready, true);
  if (result.ready) {
    assert.equal(result.lastSucceededAt.toISOString(), lastSucceededAt.toISOString());
    assert.equal(result.releaseSha, "a".repeat(40));
  }
});

test("campaign launch readiness fails closed when worker has never succeeded", () => {
  const result = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    heartbeat: { lastSucceededAt: null, lastErrorCode: null, releaseSha: null },
  });
  assert.deepEqual(result, { ready: false, code: "worker_not_started" });
});

test("campaign launch readiness fails closed on the latest worker error", () => {
  const result = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    heartbeat: { lastSucceededAt: new Date("2026-08-31T09:59:00Z"), lastErrorCode: "WHATSAPP_DELIVERIES_FAILED", releaseSha: null },
  });
  assert.deepEqual(result, { ready: false, code: "worker_failed" });
});

test("campaign launch readiness rejects stale or implausibly future heartbeats", () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const stale = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime,
    heartbeat: { lastSucceededAt: new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS), lastErrorCode: null, releaseSha: null },
  });
  const future = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime,
    heartbeat: { lastSucceededAt: new Date(currentTime.getTime() + 61_000), lastErrorCode: null, releaseSha: null },
  });
  assert.deepEqual(stale, { ready: false, code: "worker_stale" });
  assert.deepEqual(future, { ready: false, code: "worker_stale" });
});

test("campaign launch readiness fails closed when database time cannot be proven", () => {
  const result = evaluateWhatsAppCampaignLaunchReadiness({
    currentTime: null,
    heartbeat: { lastSucceededAt: new Date(), lastErrorCode: null, releaseSha: null },
  });
  assert.deepEqual(result, { ready: false, code: "database_clock_unavailable" });
});

test("server wrapper remains server-only and delegates readiness to database-backed evaluation", () => {
  const wrapper = readFileSync(new URL("../app/lib/whatsapp/campaign-launch-readiness.ts", import.meta.url), "utf8");
  assert.match(wrapper, /import "server-only"/);
  assert.match(wrapper, /SELECT CURRENT_TIMESTAMP/);
  assert.match(wrapper, /evaluateWhatsAppCampaignLaunchReadiness/);
  assert.match(wrapper, /whatsAppOperationsHeartbeat\.findUnique/);
});

test("campaign launch action proves worker readiness before enqueuing and UI disables unsafe launch", () => {
  const action = readFileSync(new URL("../app/actions/whatsapp-campaign-launch.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  const readinessIndex = action.indexOf("getWhatsAppCampaignLaunchReadiness()");
  const enqueueIndex = action.indexOf("enqueueWhatsAppCampaign(");
  assert.ok(readinessIndex >= 0 && enqueueIndex > readinessIndex, "launch action must prove operations readiness before enqueue");
  assert.match(action, /campaign\.launch\.blocked/);
  assert.match(page, /launchWhatsAppCampaignAction/);
  assert.match(page, /disabled=\{!launchReady\}/);
  assert.match(page, /الإطلاق الفوري مقفل مؤقتًا/);
});
