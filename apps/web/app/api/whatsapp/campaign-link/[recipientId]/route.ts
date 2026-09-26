import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { publicMediaUrl } from "../../../../lib/whatsapp/campaign-composition";

export async function GET(request: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(recipientId)) return new Response("الرابط غير متاح", { status: 404 });
  const recipient = await db.whatsAppCampaignRecipient.findUnique({ where: { id: recipientId }, select: { businessId: true, campaignId: true, sentAt: true, campaign: { select: { templateSnapshot: true } } } });
  const snapshot = recipient?.campaign.templateSnapshot;
  const raw = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot.trackingDestination : null;
  const destination = typeof raw === "string" ? publicMediaUrl(raw) : null;
  if (!recipient?.sentAt || !destination) return new Response("الرابط غير متاح", { status: 404 });
  const url = new URL(destination);
  if (url.hostname === "ir.sa" && url.pathname.startsWith("/api/whatsapp/campaign-link/")) return new Response("الرابط غير متاح", { status: 404 });
  url.searchParams.set("utm_source", "whatsapp"); url.searchParams.set("utm_medium", "campaign"); url.searchParams.set("utm_campaign", recipient.campaignId);
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  // Count unique tracked links, not page refreshes. Link previews are excluded where identifiable.
  const agent = request.headers.get("user-agent") ?? "";
  if (!/bot|crawler|spider|preview|facebookexternalhit/i.test(agent)) {
    await db.analyticsEvent.upsert({ where: { id: `wa-click:${recipientId}` }, create: { id: `wa-click:${recipientId}`, businessId: recipient.businessId, eventType: "whatsapp_campaign_click", metadata: { campaignId: recipient.campaignId } }, update: {} });
    response.cookies.set(`infro_campaign_${recipient.businessId}`, recipientId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  }
  return response;
}
