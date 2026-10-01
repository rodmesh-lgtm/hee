import { db } from "../app/lib/db";
import { runPeriodicTemplateSync } from "../app/lib/whatsapp/periodic-template-sync";
try {
  console.log("template-sync-worker: complete", await runPeriodicTemplateSync());
} catch {
  console.error("template-sync-worker: failed");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
