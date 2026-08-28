import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { processNextShopifyWebhookSubscriptionSync } from "../app/lib/whatsapp/shopify-webhook-subscriptions";

const batchSize = Math.max(1, Math.min(Number(process.env.WHATSAPP_SHOPIFY_SUBSCRIPTION_BATCH_SIZE ?? 25), 100));
const workerId = `shopify-subscriptions-${randomUUID()}`;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextShopifyWebhookSubscriptionSync({ workerId });
    if (!result.processed) break;
    processed += 1;
  }
  console.log("whatsapp-shopify-subscription-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("whatsapp-shopify-subscription-worker: failed", { errorCode: error instanceof Error ? error.message : "SHOPIFY_WEBHOOK_SYNC_WORKER_FAILED" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
