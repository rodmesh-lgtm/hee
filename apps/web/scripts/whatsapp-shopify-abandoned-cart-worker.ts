import { db } from "../app/lib/db";
import { detectNextAbandonedShopifyCart } from "../app/lib/whatsapp/shopify-abandoned-cart-detector";

const batchSize = Math.max(1, Math.min(Number(process.env.WHATSAPP_SHOPIFY_ABANDONED_CART_BATCH_SIZE ?? 100), 500));
let processed = 0;
let scheduled = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await detectNextAbandonedShopifyCart();
    if (!result.processed) break;
    processed += 1;
    if ("scheduled" in result) scheduled += result.scheduled ?? 0;
  }
  console.log("whatsapp-shopify-abandoned-cart-worker: complete", { processed, scheduled, batchSize });
} catch (error) {
  console.error("whatsapp-shopify-abandoned-cart-worker: failed", {
    errorCode: error instanceof Error ? error.message : "WHATSAPP_SHOPIFY_ABANDONED_CART_WORKER_FAILED",
  });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
