import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign configuration preflight executes before delivery jobs are created", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");
  const connectionGuard = queue.indexOf("WHATSAPP_CAMPAIGN_CONNECTION_NOT_READY");
  const templateGuard = queue.indexOf("WHATSAPP_CAMPAIGN_TEMPLATE_NOT_APPROVED");
  const snapshotGuard = queue.indexOf("WHATSAPP_CAMPAIGN_EMPTY_SNAPSHOT");
  const createJobs = queue.indexOf("whatsAppDeliveryJob.createMany");
  assert.ok(connectionGuard > -1 && templateGuard > -1 && snapshotGuard > -1 && createJobs > snapshotGuard && createJobs > templateGuard && createJobs > connectionGuard);
});
