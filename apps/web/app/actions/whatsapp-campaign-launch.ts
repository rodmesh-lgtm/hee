"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { getWhatsAppCampaignLaunchReadiness } from "../lib/whatsapp/campaign-launch-readiness";
import { enqueueWhatsAppCampaign } from "../lib/whatsapp/delivery-queue";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";

function campaignIdFrom(form: FormData) {
  const value = String(form.get("campaignId") ?? "").trim();
  return value && value.length <= 128 ? value : null;
}

export async function launchWhatsAppCampaignAction(form: FormData) {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }
  const campaignId = campaignIdFrom(form);
  if (!campaignId) redirect("/dashboard/whatsapp/campaigns?operation=invalid");

  const readiness = await getWhatsAppCampaignLaunchReadiness();
  if (!readiness.ready) {
    await writeWhatsAppAuditLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      action: "campaign.launch.blocked",
      targetType: "campaign",
      targetId: campaignId,
      outcome: "failed",
      metadata: { reason: readiness.code },
    }).catch(() => undefined);
    redirect(`/dashboard/whatsapp/campaigns?operation=worker-unavailable&reason=${readiness.code}`);
  }

  let destination: string;
  try {
    const result = await enqueueWhatsAppCampaign({ businessId: context.businessId, campaignId });
    await writeWhatsAppAuditLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      action: "campaign.launch.queue",
      targetType: "campaign",
      targetId: campaignId,
      outcome: "success",
      metadata: { queued: result.queued, skippedOptOut: result.skippedOptOut },
    });
    revalidatePath("/dashboard/whatsapp/campaigns");
    destination = "/dashboard/whatsapp/campaigns?operation=launch";
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WHATSAPP_CAMPAIGN_LAUNCH_FAILED";
    await writeWhatsAppAuditLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      action: "campaign.launch.queue",
      targetType: "campaign",
      targetId: campaignId,
      outcome: "failed",
      metadata: { reason },
    }).catch(() => undefined);
    destination = "/dashboard/whatsapp/campaigns?operation=failed";
  }
  redirect(destination);
}
