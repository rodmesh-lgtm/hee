import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { decideWhatsAppCampaignCanary, WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT } from "../app/lib/whatsapp/campaign-canary-domain";

test("first real campaign is limited to five recipients before any verified delivery", () => {
  assert.equal(WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT, 5);
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, priorAttemptCount: 0 }), {
    state: "canary",
    queueLimit: 5,
  });
});

test("canary slots are shared across campaigns so repeated campaigns cannot bypass the business limit", () => {
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, priorAttemptCount: 3 }), {
    state: "canary",
    queueLimit: 2,
  });
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, priorAttemptCount: 5 }), {
    state: "awaiting_delivery",
    queueLimit: 0,
  });
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: false, priorAttemptCount: 50 }), {
    state: "awaiting_delivery",
    queueLimit: 0,
  });
});

test("one verified delivered or read receipt unlocks normal queueing for the business", () => {
  assert.deepEqual(decideWhatsAppCampaignCanary({ hasVerifiedDelivery: true, priorAttemptCount: 5 }), {
    state: "verified",
    queueLimit: null,
  });
});

test("delivery queue enforces business-wide canary below immediate and scheduled enqueue callers", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");
  const action = readFileSync(new URL("../app/actions/whatsapp-campaign-launch.ts", import.meta.url), "utf8");
  assert.match(queue, /decideWhatsAppCampaignCanary/);
  assert.match(queue, /status: \{ in: \["delivered", "read"\] \}/);
  assert.match(queue, /whatsAppCampaignRecipient\.count/);
  assert.match(queue, /businessId: input\.businessId, status: \{ in: \[\.\.\.attemptedStatuses\] \}/);
  assert.match(queue, /eligible\.slice\(0, canary\.queueLimit\)/);
  assert.match(action, /canaryState/);
  assert.match(action, /canary-launched/);
  assert.match(action, /canary-awaiting/);
});
