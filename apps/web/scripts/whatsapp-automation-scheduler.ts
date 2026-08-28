import { db } from "../app/lib/db";
import { scheduleInactiveCustomerAutomationEvents } from "../app/lib/whatsapp/automation-scheduler";

async function main() {
  try {
    const result = await scheduleInactiveCustomerAutomationEvents();
    console.log("whatsapp-automation-scheduler: complete", result);
  } catch (error) {
    console.error("whatsapp-automation-scheduler: failed", {
      errorCode: error instanceof Error ? error.message : "WHATSAPP_AUTOMATION_SCHEDULER_FAILED",
    });
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
