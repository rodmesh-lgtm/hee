import { db } from "../app/lib/db";
import { runSmartReminderDeliveryWorker } from "../app/lib/reminders/delivery-worker";

async function main() {
  try {
    const result = await runSmartReminderDeliveryWorker({ database: db });
    console.log("whatsapp-reminder-delivery-worker: complete", { processed: result.processed });
  } catch (error) {
    console.error("whatsapp-reminder-delivery-worker: failed", { errorCode: error instanceof Error ? error.message : "REMINDER_DELIVERY_FAILED" });
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
