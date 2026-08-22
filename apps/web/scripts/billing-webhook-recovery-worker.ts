import "dotenv/config";

import { recoverOpenMoyasarCheckoutPayments, recoverPendingMoyasarWebhookEvents } from "../app/lib/moyasar-webhook-processing";
import { closePrismaForWorker } from "../lib/prisma";

async function main() {
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") {
    throw new Error("PAYMENT_PROVIDER must be moyasar");
  }
  if (!String(process.env.MOYASAR_SECRET_KEY ?? "").trim()) {
    throw new Error("MOYASAR_SECRET_KEY_MISSING");
  }

  const webhook = await recoverPendingMoyasarWebhookEvents(50);
  const checkout = await recoverOpenMoyasarCheckoutPayments(50);
  if (webhook.errors > 0) throw new Error(`WEBHOOK_RECOVERY_ERRORS_${webhook.errors}`);
  if (checkout.errors > 0) throw new Error(`OPEN_CHECKOUT_RECONCILIATION_ERRORS_${checkout.errors}`);
  console.log(`billing-webhook-recovery-worker: PASS (${webhook.checked} pending webhook events checked, ${webhook.processed} processed, ${webhook.retries} scheduled for retry; ${checkout.checked} open checkouts checked, ${checkout.reconciled} reconciled)`);
}

main()
  .catch((error) => {
    console.error("billing-webhook-recovery-worker: FAIL", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePrismaForWorker();
  });
