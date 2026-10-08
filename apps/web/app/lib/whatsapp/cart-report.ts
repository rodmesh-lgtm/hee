import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { cartReportFilters } from "./cart-report-domain";

export async function cartReportScope(businessId: string, filters: ReturnType<typeof cartReportFilters>) {
  const [clock] = await db.$queryRaw<Array<{ since: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP - (${filters.days} * INTERVAL '1 day') AS "since"`);
  if (!clock) throw new Error("CART_REPORT_CLOCK_UNAVAILABLE");
  // Scope the related customer as well as the cart, including exports.
  const scope = { businessId, contact: { businessId }, occurredAt: { gte: clock.since } };
  const where: Prisma.WhatsAppAutomationCartWhereInput = {
    ...scope,
    ...(filters.state !== "all" ? { state: filters.state } : {}),
    ...(filters.query ? { OR: [
      { cartId: { contains: filters.query, mode: "insensitive" } },
      { contact: { businessId, OR: [{ displayName: { contains: filters.query, mode: "insensitive" } }, { phoneE164: { contains: filters.query } }] } },
    ] } : {}),
  };
  return { scope, where };
}
