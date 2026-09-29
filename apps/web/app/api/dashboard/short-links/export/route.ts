import { Prisma } from "@prisma/client";
import { db } from "../../../../lib/db";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { shortLinkCsvCell, shortLinkUrl } from "../../../../lib/short-link-domain";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
export async function GET(request: Request) {
  const actor = await getWhatsAppReadContext("campaign.manage");
  if (!actor || !await hasActiveWhatsAppMarketingEntitlement({ businessId: actor.businessId })) return new Response(null, { status: 403 });
  const rate = await consumePublicWriteLimit({ scope: "short-link-export", businessId: actor.businessId, identity: actor.userId, limit: 5, windowSeconds: 60 });
  if (!rate.allowed) return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  const where: Prisma.BusinessShortLinkWhereInput = { businessId: actor.businessId, status: { not: "deleted" }, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { destination: { contains: q, mode: "insensitive" } }, { code: { contains: q } }] } : {}) };
  const encoder = new TextEncoder(); let cursor: string | undefined, first = true;
  const body = new ReadableStream({ async pull(controller) {
    if (first) { controller.enqueue(encoder.encode("\uFEFFالاسم,الرابط الأصلي,الرابط المختصر,النقرات,الحالة,تاريخ الإنشاء\r\n")); first = false; }
    const rows = await db.businessShortLink.findMany({ where, orderBy: { id: "asc" }, take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!rows.length) { controller.close(); return; }
    controller.enqueue(encoder.encode(rows.map(row => [row.title, row.destination, shortLinkUrl(row.code), row.clicks.toString(), row.status === "active" ? "نشط" : "متوقف", row.createdAt.toISOString()].map(shortLinkCsvCell).join(",")).join("\r\n") + "\r\n"));
    cursor = rows.at(-1)!.id;
    if (rows.length < 500) controller.close();
  } });
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="infro-short-links.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
