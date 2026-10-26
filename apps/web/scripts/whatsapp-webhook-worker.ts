import { db } from "../app/lib/db";
import { processNextWhatsAppWebhookEvent } from "../app/lib/whatsapp/webhook-processor";
import { processWebhookBatch } from "../app/lib/whatsapp/webhook-batch";

const requestedBatch = Number(process.env.WHATSAPP_WEBHOOK_BATCH_SIZE ?? "100");
const batchSize = Number.isInteger(requestedBatch) && requestedBatch > 0
  ? Math.min(requestedBatch, 500)
  : 100;

try {
  const {processed,deferred,failed} = await processWebhookBatch(batchSize, excluded => processNextWhatsAppWebhookEvent(db,null,excluded));
  console.log("whatsapp-webhook-worker: complete", { processed, deferred, failed, batchSize });
  if (failed > 0) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
