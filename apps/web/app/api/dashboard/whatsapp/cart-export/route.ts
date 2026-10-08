import { db } from "../../../../lib/db";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { CART_STATES, cartReportFilters, type CartState } from "../../../../lib/whatsapp/cart-report-domain";
import { cartReportScope } from "../../../../lib/whatsapp/cart-report";
import { campaignCsv } from "../../../../lib/whatsapp/campaign-report";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { writeWhatsAppAuditLog } from "../../../../lib/whatsapp/audit";

export async function GET(request: Request) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return Response.json({ error: "غير مصرح" }, { status: 403 });
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-cart-export", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 3600 });
  if (!rate.allowed) return Response.json({ error: "طلبات تصدير كثيرة. حاول لاحقًا." }, { status: 429 });
  const filters = cartReportFilters(Object.fromEntries(new URL(request.url).searchParams));
  const { where } = await cartReportScope(context.businessId, filters);
  const rows = await db.whatsAppAutomationCart.findMany({
    where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 5001,
    select: { cartId: true, state: true, occurredAt: true, contact: { select: { displayName: true, phoneE164: true, optedOutAt: true } } },
  });
  if (rows.length > 5000) return Response.json({ error: "اختر فترة أقصر أو صفِّ النتائج لتصدير حتى 5000 سلة في الملف." }, { status: 413 });
  await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "carts.export", targetType: "cart_report", outcome: "success", metadata: { rows: rows.length, days: filters.days } });
  const csv = campaignCsv([
    ["معرف السلة", "العميل", "الجوال", "الحالة", "آخر حدث (UTC)", "الانسحاب من الرسائل"],
    ...rows.map(row => [row.cartId, row.contact.displayName, row.contact.phoneE164, CART_STATES[row.state as CartState] ?? "غير معروفة", row.occurredAt, row.contact.optedOutAt ? "منسحب" : "غير مسجل كمنسحب"]),
  ]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="infro-carts.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
