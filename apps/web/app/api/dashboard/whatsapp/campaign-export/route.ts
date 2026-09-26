import { db } from "../../../../lib/db";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { campaignCsv } from "../../../../lib/whatsapp/campaign-report";
import { writeWhatsAppAuditLog } from "../../../../lib/whatsapp/audit";

export async function GET(request: Request) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) return Response.json({ error: "غير مصرح" }, { status: 403 });
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return Response.json({ error: "الاشتراك غير فعال" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("campaign");
  if (!id || id.length > 128) return Response.json({ error: "اختر حملة" }, { status: 400 });
  const campaign = await db.whatsAppCampaign.findFirst({ where: { id, businessId: context.businessId }, select: { id: true } });
  if (!campaign) return Response.json({ error: "الحملة غير موجودة" }, { status: 404 });
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-campaign-export", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 3600 });
  if (!rate.allowed) return Response.json({ error: "حاول لاحقًا" }, { status: 429 });
  const recipients = await db.whatsAppCampaignRecipient.findMany({
    where: { businessId: context.businessId, campaignId: campaign.id }, orderBy: { id: "asc" }, take: 10001,
    select: { phoneE164: true, displayName: true, status: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true, deliveryJob: { select: { attemptCount: true, lastErrorCode: true, nextAttemptAt: true, status: true } } },
  });
  if (recipients.length > 10000) return Response.json({ error: "حجم التقرير يتجاوز الحد المدعوم" }, { status: 413 });
  await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "campaign.export", targetType: "campaign", targetId: campaign.id, outcome: "success", metadata: { rows: recipients.length } });
  const csv = campaignCsv([["الجوال", "الاسم", "الحالة", "وقت القبول", "وقت التسليم", "وقت القراءة", "وقت الفشل", "المحاولات", "رمز الخطأ", "المحاولة القادمة"], ...recipients.map((r) => [r.phoneE164, r.displayName, r.status, r.sentAt, r.deliveredAt, r.readAt, r.failedAt, r.deliveryJob?.attemptCount, r.deliveryJob?.lastErrorCode, r.deliveryJob?.status === "retry_scheduled" ? r.deliveryJob.nextAttemptAt : null])]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="infro-campaign.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
