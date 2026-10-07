import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { messageLogFilters } from "./message-log-domain";
export async function messageLogWhere(businessId: string, filters: ReturnType<typeof messageLogFilters>): Promise<Prisma.WhatsAppMessageWhereInput> {
  const [clock] = await db.$queryRaw<Array<{ since: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP - (${filters.days} * INTERVAL '1 day') AS "since"`);
  if (!clock) throw new Error("MESSAGE_LOG_CLOCK_UNAVAILABLE");
  return { businessId, createdAt: { gte: clock.since },
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.direction !== "all" ? { direction: filters.direction } : {}),
    ...(filters.query ? { OR: [
      { textBody: { contains: filters.query, mode: "insensitive" } },
      { providerMessageId: { contains: filters.query } },
      { conversation: { businessId, OR: [{ customerPhoneE164: { contains: filters.query } }, { customerDisplayName: { contains: filters.query, mode: "insensitive" } }] } },
    ] } : {}),
  };
}
export const messageLogSelect = { id: true, direction: true, status: true, messageType: true, textBody: true, createdAt: true, deliveredAt: true, readAt: true, errorCode: true, conversation: { select: { id: true, customerDisplayName: true, customerPhoneE164: true } } } as const;
