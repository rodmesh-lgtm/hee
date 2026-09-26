import "server-only";
import { db } from "../db";

export async function recordCampaignBooking(input: { businessId: string; bookingId: string; cookieHeader: string }) {
  const name = `infro_campaign_${input.businessId}=`;
  const recipientId = input.cookieHeader.split(";").map((s) => s.trim()).find((s) => s.startsWith(name))?.slice(name.length);
  if (!recipientId || !/^[0-9a-f-]{36}$/.test(recipientId)) return;
  const [recipient, click, booking] = await Promise.all([
    db.whatsAppCampaignRecipient.findFirst({ where: { id: recipientId, businessId: input.businessId, sentAt: { not: null } }, select: { campaignId: true } }),
    db.analyticsEvent.findFirst({ where: { id: `wa-click:${recipientId}`, businessId: input.businessId, eventType: "whatsapp_campaign_click", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, select: { id: true } }),
    db.booking.findFirst({ where: { id: input.bookingId, businessId: input.businessId }, select: { id: true } }),
  ]);
  if (!recipient || !click || !booking) return;
  await db.analyticsEvent.upsert({ where: { id: `wa-booking:${input.bookingId}` }, create: { id: `wa-booking:${input.bookingId}`, businessId: input.businessId, eventType: "whatsapp_campaign_booking", metadata: { campaignId: recipient.campaignId, bookingId: booking.id } }, update: {} });
}
