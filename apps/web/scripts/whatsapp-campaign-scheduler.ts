import { db } from "../app/lib/db";
import { enqueueWhatsAppCampaign } from "../app/lib/whatsapp/delivery-queue";
import { reconcileWhatsAppCampaignCompletion } from "../app/lib/whatsapp/campaign-operations";

const now = new Date();
const due = await db.whatsAppCampaign.findMany({
  where: { status: "scheduled", scheduledAt: { lte: now } },
  select: { id: true, businessId: true }, orderBy: { scheduledAt: "asc" }, take: 100,
});
const active = await db.whatsAppCampaign.findMany({
  where: { status: { in: ["running", "paused"] } }, select: { id: true, businessId: true }, take: 100,
});
let queued = 0;
let failed = 0;
try {
  for (const campaign of due) {
    try {
      const result = await enqueueWhatsAppCampaign({ businessId: campaign.businessId, campaignId: campaign.id, now });
      queued += result.queued;
    } catch (error) {
      failed += 1;
      console.error("whatsapp-campaign-scheduler: campaign failed", { campaignId: campaign.id, error: error instanceof Error ? error.message : "UNKNOWN" });
    }
  }
  for (const campaign of active) {
    await reconcileWhatsAppCampaignCompletion({ businessId: campaign.businessId, campaignId: campaign.id, now });
  }
  console.log("whatsapp-campaign-scheduler: complete", { campaigns: due.length, queued, failed });
  if (failed) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
