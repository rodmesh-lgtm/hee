import { db } from "../app/lib/db";
import { runSmartReminderScheduler } from "../app/lib/reminders/scheduler";

async function main() {
  try {
    const result = await runSmartReminderScheduler({ database: db });
    console.log("whatsapp-reminder-scheduler: complete", { scheduled: result.scheduled, deduplicated: result.deduplicated });
  } catch (error) {
    console.error("whatsapp-reminder-scheduler: failed", { errorCode: error instanceof Error ? error.message : "REMINDER_SCHEDULER_FAILED" });
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
