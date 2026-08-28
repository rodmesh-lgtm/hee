import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { processNextContactImportBatch } from "../app/lib/whatsapp/contact-import-processor";

const requestedBatch = Number(process.env.WHATSAPP_CONTACT_IMPORT_BATCH_SIZE ?? "20");
const batchSize = Number.isInteger(requestedBatch) && requestedBatch > 0 ? Math.min(requestedBatch, 100) : 20;
const workerId = `contact-import-${randomUUID()}`;
let processed = 0;
let retries = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextContactImportBatch({ workerId });
    if (result.processed) { processed += 1; continue; }
    if ("retryScheduled" in result && result.retryScheduled) { retries += 1; continue; }
    if ("error" in result && result.error) throw new Error(result.error);
    break;
  }
  console.log("whatsapp-contact-import-worker: complete", { processed, retries, batchSize });
} catch (error) {
  console.error("whatsapp-contact-import-worker: failed", { error: error instanceof Error ? error.message : "UNKNOWN" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
