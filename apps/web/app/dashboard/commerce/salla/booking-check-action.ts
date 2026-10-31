"use server";

import { getWhatsAppWriteContext } from "../../../lib/whatsapp/rbac";
import { consumePublicWriteLimit } from "../../../lib/rate-limit";
import { db } from "../../../lib/db";
import { bookingDiagnosticPhone, bookingDiagnosticReason } from "../../../lib/commerce/booking-diagnostics";
import { syncSallaBookingOrders } from "../../../lib/commerce/salla-order-sync";
import { hasActiveBusinessSubscription } from "../../../lib/subscription-entitlement";

export type BookingCheckState = { code: string; reasons?: string[]; checkedAt?: string };
export async function checkSallaBooking(_previous: BookingCheckState, form: FormData): Promise<BookingCheckState> {
  const context = await getWhatsAppWriteContext("connection.manage");
  if (!context) return { code: "forbidden" };
  const phone = bookingDiagnosticPhone(form.get("phone"));
  if (!phone) return { code: "invalid_phone" };
  try {
    const rate = await consumePublicWriteLimit({ scope: "salla-booking-check", businessId: context.businessId, identity: context.userId, limit: 3, windowSeconds: 60 });
    if (!rate.allowed) return { code: "rate_limited" };
    const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { businessId: context.businessId, provider: "salla", status: "active" }, select: { id: true, connectedAt: true } });
    if (!integration) return { code: "store_missing" };
    if (form.get("refresh") === "yes") {
      if (!await hasActiveBusinessSubscription({ businessId: context.businessId })) return { code: "subscription_required" };
      await syncSallaBookingOrders({ businessId: context.businessId, integrationId: integration.id, actorUserId: context.userId });
    }
    const orders = await db.commerceBookingEligibility.findMany({
      where: { businessId: context.businessId, integrationId: integration.id, provider: "salla", phoneE164: phone,
        integration: { businessId: context.businessId, status: "active", provider: "salla", connectedAt: integration.connectedAt } },
      orderBy: [{ eligible: "desc" }, { updatedAt: "desc" }], take: 10,
      select: { eligible: true, phoneE164: true, paymentStatus: true, orderStatus: true },
    });
    const current = await db.whatsAppCommerceIntegration.findFirst({ where: { id: integration.id, businessId: context.businessId, status: "active", connectedAt: integration.connectedAt }, select: { id: true } });
    if (!current) return { code: "connection_changed" };
    return { code: orders.some(o => o.eligible) ? "eligible" : orders.length ? "ineligible" : "not_found", reasons: [...new Set(orders.map(bookingDiagnosticReason))], checkedAt: new Date().toISOString() };
  } catch { return { code: "unavailable" }; }
}
