import { db } from "../app/lib/db";
import { processNextWhatsAppDelivery } from "../app/lib/whatsapp/delivery-worker";

const requestedBatch = Number(process.env.WHATSAPP_DELIVERY_BATCH_SIZE ?? "100");
const batchSize = Number.isInteger(requestedBatch) && requestedBatch > 0 ? Math.min(requestedBatch, 500) : 100;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextWhatsAppDelivery();
    if (!result.processed) break;
    processed += 1;
  }
  console.log("whatsapp-delivery-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("whatsapp-delivery-worker: failed", { error: error instanceof Error ? error.message : "UNKNOWN" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
