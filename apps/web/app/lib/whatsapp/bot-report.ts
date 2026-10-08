import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";

export type BotReportRow = { messageId: string; conversationId: string; status: string; reason: string | null; deliveryStatus: string | null; createdAt: Date; name: string; phone: string | null };
export async function getBotReport(businessId: string, days: number, database: Pick<PrismaClient, "$queryRaw"> = db) {
  const windowDays = [1, 7, 30].includes(days) ? days : 7;
  const [summary, bots, turns] = await Promise.all([
    database.$queryRaw<Array<{ total: number; sent: number; handoff: number; failed: number }>>(Prisma.sql`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE j.status='sent')::int AS sent,
        count(*) FILTER (WHERE t.status='handoff')::int AS handoff,
        count(*) FILTER (WHERE t.status='failed' OR j.status='failed')::int AS failed
      FROM "WhatsAppBotTurn" t
      LEFT JOIN "WhatsAppReplyJob" j ON j.id=t."replyJobId" AND j."businessId"=t."businessId"
      WHERE t."businessId"=${businessId} AND t."createdAt">=CURRENT_TIMESTAMP-(${windowDays} * interval '1 day')`),
    database.$queryRaw<Array<{ connectionId: string; name: string; mode: string; enabled: boolean; connected: boolean; phone: string | null; dailyLimit: number; used: number }>>(Prisma.sql`
      SELECT b."connectionId",b.config->>'name' AS name,b.config->>'mode' AS mode,b.enabled,
        (c.status='connected' AND c."disabledAt" IS NULL) AS connected,c."displayPhoneNumber" AS phone,
        (b.config->>'dailyLimit')::int AS "dailyLimit",count(t."messageId")::int AS used
      FROM "WhatsAppServiceBot" b
      JOIN "WhatsAppConnection" c ON c.id=b."connectionId" AND c."businessId"=b."businessId"
      LEFT JOIN "WhatsAppBotTurn" t ON t."connectionId"=b."connectionId" AND t."businessId"=b."businessId"
        AND t."createdAt">=date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      WHERE b."businessId"=${businessId}
      GROUP BY b."connectionId",b.config,b.enabled,c.status,c."disabledAt",c."displayPhoneNumber"
      ORDER BY b.enabled DESC,b."connectionId"`),
    database.$queryRaw<BotReportRow[]>(Prisma.sql`
      SELECT t."messageId",t."conversationId",t.status,t.reason,t."createdAt",j.status AS "deliveryStatus",
        b.config->>'name' AS name,c."displayPhoneNumber" AS phone
      FROM "WhatsAppBotTurn" t
      JOIN "WhatsAppServiceBot" b ON b."connectionId"=t."connectionId" AND b."businessId"=t."businessId"
      JOIN "WhatsAppConnection" c ON c.id=t."connectionId" AND c."businessId"=t."businessId"
      LEFT JOIN "WhatsAppReplyJob" j ON j.id=t."replyJobId" AND j."businessId"=t."businessId"
      WHERE t."businessId"=${businessId} AND t."createdAt">=CURRENT_TIMESTAMP-(${windowDays} * interval '1 day')
      ORDER BY t."createdAt" DESC,t."messageId" DESC LIMIT 50`),
  ]);
  return { summary: summary[0] ?? { total: 0, sent: 0, handoff: 0, failed: 0 }, bots, turns };
}
