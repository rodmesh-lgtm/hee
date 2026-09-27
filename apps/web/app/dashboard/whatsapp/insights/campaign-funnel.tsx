import { Prisma } from "@prisma/client";
import { db } from "../../../lib/db";

export async function CampaignFunnel({ businessId, since }: { businessId: string; since: Date }) {
  const rows = await db.$queryRaw<Array<{ id: string; name: string; clicks: number; bookings: number; replies: number }>>(Prisma.sql`
    SELECT c."id", c."name",
      (SELECT COUNT(*)::int FROM "AnalyticsEvent" a WHERE a."businessId" = c."businessId" AND a."eventType" = 'whatsapp_campaign_click' AND a."metadata"->>'campaignId' = c."id") AS clicks,
      (SELECT COUNT(*)::int FROM "AnalyticsEvent" a WHERE a."businessId" = c."businessId" AND a."eventType" = 'whatsapp_campaign_booking' AND a."metadata"->>'campaignId' = c."id") AS bookings,
      (SELECT COUNT(DISTINCT j."recipientId")::int FROM "WhatsAppDeliveryJob" j
       JOIN "WhatsAppMessage" m ON m."businessId" = j."businessId" AND m."direction" = 'inbound' AND m."payload"->'context'->>'id' = j."providerMessageId"
       WHERE j."businessId" = c."businessId" AND j."campaignId" = c."id") AS replies
    FROM "WhatsAppCampaign" c WHERE c."businessId" = ${businessId} AND c."createdAt" >= ${since}
    ORDER BY c."createdAt" DESC LIMIT 100
  `);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold text-slate-900">من الرسالة إلى الحجز</h2><p className="mt-2 text-xs leading-6 text-slate-500">النقرات روابط مستلمين فريدة مع استبعاد المعاينات المعروفة. الردود هي الردود المقتبسة المرتبطة برسالة الحملة. الحجوزات المسجلة من نفس المتصفح خلال 7 أيام من النقرة، ولا تعني إيرادًا أو طلبًا مدفوعًا جديدًا.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-right text-xs"><thead className="text-slate-500"><tr>{["الحملة", "نقرات فريدة", "مستلمون ردوا", "حجوزات", "تقرير"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100 text-slate-700"><td className="p-3">{row.name}</td><td className="p-3">{row.clicks}</td><td className="p-3">{row.replies}</td><td className="p-3">{row.bookings}</td><td className="p-3"><a className="text-[#008f87]" href={`/api/dashboard/whatsapp/campaign-export?campaign=${encodeURIComponent(row.id)}`}>CSV</a></td></tr>)}</tbody></table></div>{!rows.length ? <p className="mt-3 text-xs text-slate-500">تظهر النتائج بعد إطلاق حملتك الأولى.</p> : null}</section>;
}
