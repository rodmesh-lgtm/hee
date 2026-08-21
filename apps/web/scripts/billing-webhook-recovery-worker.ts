import "dotenv/config";

import { recoverPendingMoyasarWebhookEvents } from "../app/lib/moyasar-webhook-processing";

async function main() {
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") {
    throw new Error("PAYMENT_PROVIDER must be moyasar");
  }
  if (!String(process.env.MOYASAR_SECRET_KEY ?? "").trim()) {
    throw new Error("MOYASAR_SECRET_KEY_MISSING");
  }

  const result = await recoverPendingMoyasarWebhookEvents(50);
  console.log(`billing-webhook-recovery-worker: PASS (${result.checked} pending events checked, ${result.processed} claimed)`);
}

main().catch((error) => {
  console.error("billing-webhook-recovery-worker: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
