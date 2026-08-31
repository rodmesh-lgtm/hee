import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { decideWhatsAppCampaignCanary, WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT } from "../app/lib/whatsapp/campaign-canary-domain";

test("first real campaign is limited to a small canary before any verified delivery", () => {
  assert.equal(WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT, 5);
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, hasPriorCurrentAttempt: false }), {
    state: "canary",
    queueLimit: 5,
  });
});

test("a repeated launch cannot expand the canary while delivery is still unproven", () => {
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, hasPriorCurrentAttempt: true }), {
    state: "awaiting_delivery",
    queueLimit: 0,
  });
});

test("one verified delivered or read receipt unlocks normal queueing for the business", () => {
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: true, hasPriorCurrentAttempt: true }), {
    state: "verified",
    queueLimit: null,
  });
});

test("delivery queue enforces canary below immediate and scheduled enqueue callers", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");
  const action = readFileSync(new URL("../app/actions/whatsapp-campaign-launch.ts", import.meta.url), "utf8");
  assert.match(queue, /decideWhatsAppCampaignCanary/);
  assert.match(queue, /status: \{ in: \["delivered", "read"\] \}/);
  assert.match(queue, /status: \{ in: \["queued", "processing", "sent", "failed", "cancelled"\] \}/);
  assert.match(queue, /eligible\.slice\(0, canary\.queueLimit\)/);
  assert.match(action, /canaryState/);
  assert.match(action, /canary-launched/);
  assert.match(action, /canary-awaiting/);
});
