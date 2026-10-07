import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { parseBotConfig, type BotConfig } from "./bot-domain";
import { writeWhatsAppAuditLog } from "./audit";

export type StoredBot = { connectionId: string; businessId: string; config: BotConfig; enabled: boolean; revision: number };
export async function botSchemaReady(database: Pick<PrismaClient, "$queryRaw"> = db) {
  const [row] = await database.$queryRaw<Array<{ ready: boolean }>>`SELECT to_regclass('"WhatsAppServiceBot"') IS NOT NULL AND to_regclass('"WhatsAppBotTurn"') IS NOT NULL AND to_regclass('"WhatsAppBotHandoff"') IS NOT NULL AS ready`;
  return row?.ready === true;
}
export async function saveServiceBot(input: { businessId: string; userId: string; connectionId: string; config: unknown; enabled: boolean; database?: PrismaClient }) {
  const config = parseBotConfig(input.config), database = input.database ?? db;
  return database.$transaction(async tx => {
    const connection = await tx.whatsAppConnection.findFirst({ where: { id: input.connectionId, businessId: input.businessId, provider: "meta", status: "connected", disabledAt: null }, select: { id: true } });
    if (!connection) throw new Error("BOT_CONNECTION_UNAVAILABLE");
    await tx.$executeRaw(Prisma.sql`INSERT INTO "WhatsAppServiceBot" ("connectionId","businessId","config","enabled","enabledAt","updatedByUserId") VALUES (${connection.id},${input.businessId},${JSON.stringify(config)}::jsonb,${input.enabled},CASE WHEN ${input.enabled} THEN CURRENT_TIMESTAMP ELSE NULL END,${input.userId}) ON CONFLICT ("connectionId") DO UPDATE SET "config"=EXCLUDED."config","enabled"=EXCLUDED."enabled","enabledAt"=EXCLUDED."enabledAt","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=CURRENT_TIMESTAMP,"revision"="WhatsAppServiceBot"."revision"+1 WHERE "WhatsAppServiceBot"."businessId"=${input.businessId}`);
    // Any queued answer belongs to the old configuration. Human replies are untouched.
    await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppReplyJob" j SET "status"='cancelled',"lastErrorCode"='BOT_CONFIGURATION_CHANGED',"updatedAt"=CURRENT_TIMESTAMP FROM "WhatsAppBotTurn" t WHERE t."replyJobId"=j.id AND t."connectionId"=${connection.id} AND t."businessId"=${input.businessId} AND j."businessId"=${input.businessId} AND j.status IN ('queued','retry_scheduled')`);
    await writeWhatsAppAuditLog({ database: tx, businessId: input.businessId, actorUserId: input.userId, action: input.enabled ? "bot.enabled" : "bot.saved_paused", targetType: "service_bot", targetId: connection.id, outcome: "success", metadata: { mode: config.mode, dailyLimit: config.dailyLimit } });
  });
}

// Rechecked by the sending worker on every attempt, including a delayed retry.
export async function botReplyAllowed(database: PrismaClient, jobId: string, businessId: string) {
  if (!await botSchemaReady(database)) return true;
  const turns = await database.$queryRaw<Array<{ allowed: boolean }>>(Prisma.sql`
    SELECT (b.enabled AND b.revision=t.revision AND c."assignedToUserId" IS NULL
      AND (t.status='handoff' OR h."conversationId" IS NULL OR NOT h.active)
      AND NOT EXISTS (SELECT 1 FROM "WhatsAppContact" p WHERE p."businessId"=t."businessId" AND p."phoneE164"=c."customerPhoneE164" AND (p."optedOutAt" IS NOT NULL OR p."deletedAt" IS NOT NULL))
      AND NOT EXISTS (SELECT 1 FROM "WhatsAppMessage" n WHERE n."businessId"=t."businessId" AND n."conversationId"=t."conversationId" AND (n."createdAt",n.id)>(m."createdAt",m.id))
      AND NOT EXISTS (SELECT 1 FROM "WhatsAppReplyJob" j WHERE j."businessId"=t."businessId" AND j."conversationId"=t."conversationId" AND j.id<>${jobId} AND j.status IN ('queued','processing','retry_scheduled'))
    ) AS allowed FROM "WhatsAppBotTurn" t
    LEFT JOIN "WhatsAppServiceBot" b ON b."connectionId"=t."connectionId" AND b."businessId"=t."businessId"
    LEFT JOIN "WhatsAppConversation" c ON c.id=t."conversationId" AND c."businessId"=t."businessId"
    LEFT JOIN "WhatsAppMessage" m ON m.id=t."messageId" AND m."businessId"=t."businessId" AND m."conversationId"=t."conversationId"
    LEFT JOIN "WhatsAppBotHandoff" h ON h."conversationId"=c.id AND h."businessId"=c."businessId"
    WHERE t."replyJobId"=${jobId} AND t."businessId"=${businessId}`);
  return !turns.length || turns[0].allowed === true;
}
