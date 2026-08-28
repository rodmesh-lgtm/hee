import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { processNextWhatsAppAutomationEvent } from "../app/lib/whatsapp/automation-processor";

const batchSize = Math.max(1, Math.min(Number(process.env.WHATSAPP_AUTOMATION_BATCH_SIZE ?? 50), 200));
const workerId = `automation-${randomUUID()}`;
let processed = 0;

try {
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextWhatsAppAutomationEvent({ workerId });
    if (!result.processed) {
      if ("empty" in result && result.empty) break;
      continue;
    }
    processed += 1;
  }
  console.log("whatsapp-automation-worker: complete", { processed, batchSize });
} catch (error) {
  console.error("whatsapp-automation-worker: failed", {
    error: error instanceof Error ? error.message : "UNKNOWN",
  });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
