import assert from "node:assert/strict";
import test from "node:test";

import { commerceIntegrationHealth } from "../app/lib/commerce/integration-health";

const now = new Date("2026-09-19T18:00:00Z");

test("commerce health distinguishes inactive, bootstrapping and healthy integrations", () => {
  assert.equal(commerceIntegrationHealth(null, now).state, "inactive");
  assert.equal(commerceIntegrationHealth({ status: "active", connectedAt: new Date("2026-09-19T17:30:00Z") }, now).state, "syncing");
  assert.equal(commerceIntegrationHealth({ status: "active", lastWebhookAt: new Date("2026-09-19T17:00:00Z") }, now).state, "healthy");
});

test("commerce health prioritizes actionable errors and detects stale data", () => {
  assert.equal(commerceIntegrationHealth({ status: "active", lastErrorCode: "SYNC_FAILED", lastWebhookAt: now }, now).state, "action_required");
  assert.equal(commerceIntegrationHealth({ status: "active", lastWebhookAt: new Date("2026-09-19T04:00:00Z") }, now).state, "delayed");
});
