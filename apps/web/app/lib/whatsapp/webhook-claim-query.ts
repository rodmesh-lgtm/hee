import { Prisma } from "@prisma/client";

export function webhookClaimQuery(eventId: string | null, excludedIds: readonly string[] = []) {
  return Prisma.sql`
    SELECT "id", "businessId", "provider", "phoneNumberId", "eventType", "payload"
    FROM "WhatsAppWebhookEvent"
    WHERE "processedAt" IS NULL
      AND (${eventId}::text IS NULL OR "id" = ${eventId})
      ${excludedIds.length ? Prisma.sql`AND "id" NOT IN (${Prisma.join(excludedIds.slice(0,500))})` : Prisma.empty}
    ORDER BY CASE WHEN "processingError" = 'WHATSAPP_STATUS_MESSAGE_NOT_FOUND' THEN 1 ELSE 0 END,
      "receivedAt" ASC, "id" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
}
