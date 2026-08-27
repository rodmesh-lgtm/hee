import { db } from "../app/lib/db";
import { processNextWhatsAppWebhookEvent } from "../app/lib/whatsapp/webhook-processor";

const requestedBatch = Number(process.env.WHATSAPP_WEBHOOK_BATCH_SIZE ?? "100");
const batchSize = Number.isInteger(requestedBatch) && requestedBatch > 0
  ? Math.min(requestedBatch, 500)
  : 100;

let processed = 0;
let failed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextWhatsAppWebhookEvent();
    if (result.processed) {
      processed += 1;
      continue;
    }
    if ("error" in result && result.error) {
      failed += 1;
      console.error("whatsapp-webhook-worker: event processing failed", {
        eventId: result.id,
        error: result.error,
      });
      break;
    }
    break;
  }

  console.log("whatsapp-webhook-worker: complete", { processed, failed, batchSize });
  if (failed > 0) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
