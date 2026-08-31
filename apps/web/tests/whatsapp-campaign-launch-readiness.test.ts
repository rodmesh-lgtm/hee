import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateWhatsAppCampaignLaunchReadiness,
  WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS,
} from "../app/lib/whatsapp/campaign-launch-readiness-domain";

const releaseSha = "a".repeat(40);

function readiness(input: Parameters<typeof evaluateWhatsAppCampaignLaunchReadiness>[0]) {
  return evaluateWhatsAppCampaignLaunchReadiness(input);
}

test("campaign launch readiness requires a fresh successful exact-release operations heartbeat", () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const lastSucceededAt = new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS + 1_000);
  const result = readiness({
    currentTime,
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt, lastErrorCode: null, releaseSha },
  });
  assert.equal(result.ready, true);
  if (result.ready) {
    assert.equal(result.lastSucceededAt.toISOString(), lastSucceededAt.toISOString());
    assert.equal(result.releaseSha, releaseSha);
  }
});

test("campaign launch readiness fails closed when web release identity cannot be proven", () => {
  const result = readiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    expectedReleaseSha: null,
    heartbeat: { lastSucceededAt: new Date("2026-08-31T09:59:00Z"), lastErrorCode: null, releaseSha },
  });
  assert.deepEqual(result, { ready: false, code: "web_release_unavailable" });
});

test("campaign launch readiness rejects a healthy worker from a different release", () => {
  const result = readiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: new Date("2026-08-31T09:59:00Z"), lastErrorCode: null, releaseSha: "b".repeat(40) },
  });
  assert.deepEqual(result, { ready: false, code: "worker_release_mismatch" });
});

test("campaign launch readiness fails closed when worker has never succeeded", () => {
  const result = readiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: null, lastErrorCode: null, releaseSha },
  });
  assert.deepEqual(result, { ready: false, code: "worker_not_started" });
});

test("campaign launch readiness fails closed on the latest worker error", () => {
  const result = readiness({
    currentTime: new Date("2026-08-31T10:00:00Z"),
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: new Date("2026-08-31T09:59:00Z"), lastErrorCode: "WHATSAPP_DELIVERIES_FAILED", releaseSha },
  });
  assert.deepEqual(result, { ready: false, code: "worker_failed" });
});

test("campaign launch readiness rejects stale or implausibly future heartbeats", () => {
  const currentTime = new Date("2026-08-31T10:00:00Z");
  const stale = readiness({
    currentTime,
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: new Date(currentTime.getTime() - WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS), lastErrorCode: null, releaseSha },
  });
  const future = readiness({
    currentTime,
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: new Date(currentTime.getTime() + 61_000), lastErrorCode: null, releaseSha },
  });
  assert.deepEqual(stale, { ready: false, code: "worker_stale" });
  assert.deepEqual(future, { ready: false, code: "worker_stale" });
});

test("campaign launch readiness fails closed when database time cannot be proven", () => {
  const result = readiness({
    currentTime: null,
    expectedReleaseSha: releaseSha,
    heartbeat: { lastSucceededAt: new Date(), lastErrorCode: null, releaseSha },
  });
  assert.deepEqual(result, { ready: false, code: "database_clock_unavailable" });
});

test("server wrapper remains server-only and binds readiness to the deployed release", () => {
  const wrapper = readFileSync(new URL("../app/lib/whatsapp/campaign-launch-readiness.ts", import.meta.url), "utf8");
  assert.match(wrapper, /import "server-only"/);
  assert.match(wrapper, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(wrapper, /RELEASE_SHA/);
  assert.match(wrapper, /expectedReleaseSha/);
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
  assert.match(page, /إصدار عامل WhatsApp لا يطابق إصدار الويب الحالي/);
});
