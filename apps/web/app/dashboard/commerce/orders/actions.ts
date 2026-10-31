"use server";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { bookingDiagnosticPhone, bookingDiagnosticReason } from "../../../lib/commerce/booking-diagnostics";

export type OrderListState = { code: string; page: number; more: boolean; rows: { key: string; id: string; provider: string; store: string; phone: string | null; payment: string | null; status: string | null; reason: string; updated: string | null; synced: string }[] };
export async function listStoreOrders(_previous: OrderListState, form: FormData): Promise<OrderListState> {
  const empty: OrderListState = { code: "", page: 0, more: false, rows: [] };
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) return { ...empty, code: "forbidden" };
  const query = String(form.get("query") ?? "").trim();
  const provider = String(form.get("provider") ?? "");
  const eligibility = String(form.get("eligibility") ?? "");
  const page = Math.min(200, Math.max(0, Number.parseInt(String(form.get("page") ?? "0"), 10) || 0));
  if (query.length > 160 || !["", "salla", "shopify", "woocommerce"].includes(provider) || !["", "yes", "no"].includes(eligibility)) return { ...empty, code: "invalid" };
  const phone = bookingDiagnosticPhone(query);
  try {
    const orders = await db.commerceBookingEligibility.findMany({
      where: { businessId: context.businessId,
        integration: { businessId: context.businessId, status: "active" },
        ...(provider ? { provider } : { provider: { in: ["salla", "shopify", "woocommerce"] } }),
        ...(eligibility ? { eligible: eligibility === "yes" } : {}),
        ...(query ? { OR: [{ externalOrderId: query }, ...(phone ? [{ phoneE164: phone }] : [])] } : {}),
      },
      orderBy: [{ providerUpdatedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      skip: page * 25, take: 26,
      select: { id: true, externalOrderId: true, provider: true, phoneE164: true, paymentStatus: true, orderStatus: true, eligible: true, providerUpdatedAt: true, updatedAt: true, integration: { select: { displayName: true } } },
    });
    return { code: "ok", page, more: orders.length > 25, rows: orders.slice(0, 25).map(o => ({ key: o.id, id: o.externalOrderId, provider: o.provider, store: o.integration.displayName || o.provider, phone: o.phoneE164, payment: o.paymentStatus, status: o.orderStatus, reason: bookingDiagnosticReason(o), updated: o.providerUpdatedAt?.toISOString() ?? null, synced: o.updatedAt.toISOString() })) };
  } catch { return { ...empty, code: "unavailable" }; }
}
