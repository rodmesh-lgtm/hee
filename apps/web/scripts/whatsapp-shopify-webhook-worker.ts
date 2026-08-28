import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { processNextShopifyWebhookEvent } from "../app/lib/whatsapp/shopify-webhook-processor";

const batchSize = Math.max(1, Math.min(Number(process.env.WHATSAPP_SHOPIFY_WEBHOOK_BATCH_SIZE ?? 100), 500));
const workerId = `shopify-${randomUUID()}`;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextShopifyWebhookEvent({ workerId });
    if (!result.processed) break;
    processed += 1;
  }
  console.log("whatsapp-shopify-webhook-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("whatsapp-shopify-webhook-worker: failed", { errorCode: error instanceof Error ? error.message : "WHATSAPP_SHOPIFY_WEBHOOK_WORKER_FAILED" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
