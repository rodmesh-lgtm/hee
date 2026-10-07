import { db } from "../../../../lib/db";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { messageLogFilters, MESSAGE_LOG_STATES } from "../../../../lib/whatsapp/message-log-domain";
import { messageLogSelect, messageLogWhere } from "../../../../lib/whatsapp/message-log";
import { campaignCsv } from "../../../../lib/whatsapp/campaign-report";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { writeWhatsAppAuditLog } from "../../../../lib/whatsapp/audit";
export async function GET(request: Request) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return Response.json({ error: "غير مصرح" }, { status: 403 });
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-message-export", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 3600 });
  if (!rate.allowed) return Response.json({ error: "حاول لاحقًا" }, { status: 429 });
  const filters = messageLogFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await db.whatsAppMessage.findMany({ where: await messageLogWhere(context.businessId, filters), select: messageLogSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5001 });
  if (rows.length > 5000) return Response.json({ error: "اختر فترة أقصر أو صفِّ النتائج لتصدير حتى 5000 رسالة في الملف" }, { status: 413 });
  await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "messages.export", targetType: "message_log", outcome: "success", metadata: { rows: rows.length } });
  const csv = campaignCsv([["العميل", "الجوال", "الاتجاه", "الحالة", "النص", "وقت التسجيل", "وقت التسليم", "وقت القراءة", "رمز Meta"], ...rows.map(row => [row.conversation.customerDisplayName, row.conversation.customerPhoneE164, row.direction === "inbound" ? "واردة" : "صادرة", MESSAGE_LOG_STATES[row.status as keyof typeof MESSAGE_LOG_STATES] ?? row.status, row.textBody, row.createdAt, row.deliveredAt, row.readAt, row.errorCode && /^\d{1,10}$/.test(row.errorCode) ? row.errorCode : null])]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="infro-messages.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
