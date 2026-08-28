import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { processNextWhatsAppAutomationDelivery } from "../app/lib/whatsapp/automation-delivery-worker";

const requestedBatch = Number(process.env.WHATSAPP_AUTOMATION_DELIVERY_BATCH_SIZE ?? "100");
const batchSize = Number.isInteger(requestedBatch) && requestedBatch > 0 ? Math.min(requestedBatch, 500) : 100;
const workerId = `automation-delivery-${randomUUID()}`;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextWhatsAppAutomationDelivery({ workerId });
    if (!result.processed) break;
    processed += 1;
  }
  console.log("whatsapp-automation-delivery-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("whatsapp-automation-delivery-worker: failed", {
    errorCode: error instanceof Error ? error.message : "WHATSAPP_AUTOMATION_DELIVERY_FAILED",
  });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
