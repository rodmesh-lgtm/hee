import { randomUUID } from "node:crypto";

import { db } from "../app/lib/db";
import { processNextSallaWebhookEvent } from "../app/lib/commerce/salla-webhook-processor";

const batchSize = Math.max(1, Math.min(Number(process.env.SALLA_WEBHOOK_BATCH_SIZE ?? 100), 500));
const workerId = `salla-${randomUUID()}`;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextSallaWebhookEvent({ workerId });
    if (!result.processed) break;
    processed += 1;
  }
  console.log("salla-webhook-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("salla-webhook-worker: failed", { errorCode: error instanceof Error ? error.message : "SALLA_WEBHOOK_WORKER_FAILED" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
