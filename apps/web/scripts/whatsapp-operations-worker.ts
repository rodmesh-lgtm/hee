import { db } from "../app/lib/db";
import { runWhatsAppOperations } from "../app/lib/whatsapp/operations-worker";

async function main() {
  try {
    const result = await runWhatsAppOperations({ database: db });
    if (!result.enabled) {
      console.log("whatsapp-operations-worker: disabled");
    } else {
      console.log("whatsapp-operations-worker: complete", {
        completedStages: result.completedStages.length,
        releaseSha: result.releaseSha,
      });
    }
  } catch (error) {
    console.error("whatsapp-operations-worker: failed", {
      errorCode: error instanceof Error ? error.message : "WHATSAPP_OPERATIONS_FAILED",
    });
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
