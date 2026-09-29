import { db } from "../../lib/db";
import { shortLinkDestination, shouldCountShortLinkClick } from "../../lib/short-link-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../../lib/whatsapp/feature-entitlement";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
async function resolve(request: Request, params: Promise<{ code: string }>) {
  const { code } = await params;
  const unavailable = () => new Response(request.method === "HEAD" ? null : "الرابط غير متاح", { status: 404, headers });
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) return unavailable();
  const link = await db.businessShortLink.findFirst({ where: { code, status: "active", business: { deletedAt: null } }, select: { id: true, businessId: true, destination: true } });
  if (!link || !await hasActiveWhatsAppMarketingEntitlement({ businessId: link.businessId })) return unavailable();
  const destination = shortLinkDestination(link.destination);
  if (!destination) return unavailable();
  if (shouldCountShortLinkClick(request.method, request.headers.get("user-agent") ?? "")) {
    const counted = await db.businessShortLink.updateMany({ where: { id: link.id, businessId: link.businessId, status: "active", destination: link.destination }, data: { clicks: { increment: 1 }, lastClickedAt: new Date() } });
    if (!counted.count) return unavailable();
  }
  return new Response(null, { status: 302, headers: { ...headers, Location: destination } });
}
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) { return resolve(request, params); }
export async function HEAD(request: Request, { params }: { params: Promise<{ code: string }> }) { return resolve(request, params); }
