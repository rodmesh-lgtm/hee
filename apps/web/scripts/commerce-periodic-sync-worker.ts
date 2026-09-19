import { db } from "../app/lib/db";
import { runPeriodicCommerceOrderSync } from "../app/lib/commerce/periodic-order-sync";

try {
  const result = await runPeriodicCommerceOrderSync();
  console.log("commerce-periodic-sync-worker: complete", result);
} catch (error) {
  console.error("commerce-periodic-sync-worker: failed", { errorCode: error instanceof Error ? error.message : "COMMERCE_PERIODIC_SYNC_FAILED" });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
