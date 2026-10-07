import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { botOptOut, parseBotConfig } from "./bot-domain";
import { answerBotQuestion, botAiReady } from "./bot-ai";
import { botSchemaReady, type StoredBot } from "./bot-store";
import { assertOutboundEnabled } from "./delivery-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "./feature-entitlement";
import { writeWhatsAppAuditLog } from "./audit";

type Turn = StoredBot & { messageId: string; conversationId: string; textBody: string; phoneNumberId: string };
export async function processNextServiceBotTurn(input: { database?: PrismaClient; env?: NodeJS.ProcessEnv; fetcher?: typeof fetch } = {}) {
  const database = input.database ?? db, env = input.env ?? process.env;
  assertOutboundEnabled(env);
  if (!await botSchemaReady(database)) return { processed: false };
  await database.$executeRaw`UPDATE "WhatsAppBotTurn" SET status='failed',reason='PROCESSING_EXPIRED',"completedAt"=CURRENT_TIMESTAMP WHERE status='processing' AND "createdAt"<CURRENT_TIMESTAMP-interval '5 minutes'`;
  const turn = await database.$transaction(async tx => {
    // Configuration row serializes the daily budget and reservations across workers.
    const bots = await tx.$queryRaw<StoredBot[]>(Prisma.sql`SELECT b.* FROM "WhatsAppServiceBot" b WHERE b.enabled
      AND (SELECT count(*) FROM "WhatsAppBotTurn" t WHERE t."connectionId"=b."connectionId" AND t."businessId"=b."businessId" AND t."createdAt">=date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) < (b.config->>'dailyLimit')::int
      AND EXISTS (SELECT 1 FROM "WhatsAppMessage" m JOIN "WhatsAppConversation" c ON c.id=m."conversationId" AND c."businessId"=m."businessId" JOIN "WhatsAppConnection" x ON x.id=b."connectionId" AND x."businessId"=b."businessId" AND x."phoneNumberId"=c."phoneNumberId"
        WHERE m."businessId"=b."businessId" AND m.direction='inbound' AND m."createdAt">=b."enabledAt" AND m."providerTimestamp">=b."enabledAt" AND m."providerTimestamp">CURRENT_TIMESTAMP-interval '24 hours' AND NOT EXISTS (SELECT 1 FROM "WhatsAppBotTurn" t WHERE t."messageId"=m.id))
      ORDER BY (SELECT max(t."createdAt") FROM "WhatsAppBotTurn" t WHERE t."connectionId"=b."connectionId" AND t."businessId"=b."businessId") ASC NULLS FIRST,b."updatedAt" FOR UPDATE OF b SKIP LOCKED LIMIT 1`);
    const bot = bots[0]; if (!bot) return null;
    const messages = await tx.$queryRaw<Array<{ messageId: string; conversationId: string; textBody: string | null; phoneNumberId: string; eligible: boolean }>>(Prisma.sql`
      SELECT m.id AS "messageId",c.id AS "conversationId",m."textBody",c."phoneNumberId",
        (m."messageType"='text' AND c."assignedToUserId" IS NULL AND x.provider='meta' AND x.status='connected' AND x."disabledAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM "WhatsAppBotHandoff" h WHERE h."conversationId"=c.id AND h."businessId"=c."businessId" AND (h.active OR m."createdAt"<=h."createdAt"))
          AND NOT EXISTS (SELECT 1 FROM "WhatsAppContact" p WHERE p."businessId"=c."businessId" AND p."phoneE164"=c."customerPhoneE164" AND (p."optedOutAt" IS NOT NULL OR p."deletedAt" IS NOT NULL))
          AND NOT EXISTS (SELECT 1 FROM "WhatsAppMessage" n WHERE n."businessId"=m."businessId" AND n."conversationId"=c.id AND (n."createdAt",n.id)>(m."createdAt",m.id))
          AND NOT EXISTS (SELECT 1 FROM "WhatsAppReplyJob" j WHERE j."businessId"=c."businessId" AND j."conversationId"=c.id AND j.status IN ('queued','processing','retry_scheduled'))
        ) AS eligible
      FROM "WhatsAppMessage" m JOIN "WhatsAppConversation" c ON c.id=m."conversationId" AND c."businessId"=m."businessId"
      JOIN "WhatsAppConnection" x ON x.id=${bot.connectionId} AND x."businessId"=m."businessId" AND x."phoneNumberId"=c."phoneNumberId"
      WHERE m."businessId"=${bot.businessId} AND m.direction='inbound' AND m."createdAt">=(SELECT "enabledAt" FROM "WhatsAppServiceBot" WHERE "connectionId"=${bot.connectionId})
        AND m."providerTimestamp">=(SELECT "enabledAt" FROM "WhatsAppServiceBot" WHERE "connectionId"=${bot.connectionId}) AND m."providerTimestamp">CURRENT_TIMESTAMP-interval '24 hours'
        AND NOT EXISTS (SELECT 1 FROM "WhatsAppBotTurn" t WHERE t."messageId"=m.id)
      ORDER BY m."createdAt",m.id LIMIT 1`);
    const message = messages[0]; if (!message) return null;
    const usable = message.eligible && Boolean(message.textBody?.trim()) && (message.textBody?.length ?? 0) <= 2000 && !botOptOut(message.textBody ?? "");
    const inserted = await tx.$executeRaw(Prisma.sql`INSERT INTO "WhatsAppBotTurn" ("messageId","businessId","connectionId","conversationId",revision,status,reason) VALUES (${message.messageId},${bot.businessId},${bot.connectionId},${message.conversationId},${bot.revision},${usable ? "processing" : "skipped"},${usable ? null : "INELIGIBLE"}) ON CONFLICT DO NOTHING`);
    return inserted && usable ? { ...bot, ...message, textBody: message.textBody! } as Turn : { skipped: true as const };
  });
  if (!turn) return { processed: false };
  if ("skipped" in turn) return { processed: true, result: "skipped" };
  let answer: { reply: string; handoff: boolean };
  try {
    if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: turn.businessId, database })) throw new Error("ENTITLEMENT_REQUIRED");
    const config = parseBotConfig(turn.config);
    if (config.mode === "ai" && !botAiReady(env)) throw new Error("BOT_AI_UNAVAILABLE");
    answer = await answerBotQuestion(config, turn.textBody, { env, fetcher: input.fetcher });
  } catch {
    await database.$executeRaw(Prisma.sql`UPDATE "WhatsAppBotTurn" SET status='failed',reason='ANSWER_UNAVAILABLE',"completedAt"=CURRENT_TIMESTAMP WHERE "messageId"=${turn.messageId} AND "businessId"=${turn.businessId}`);
    return { processed: true, result: "failed" };
  }
  // Generation is outside the transaction. Revalidate everything before creating an outbound job.
  await database.$transaction(async tx => {
    const active = await tx.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`SELECT enabled FROM "WhatsAppServiceBot" WHERE "connectionId"=${turn.connectionId} AND "businessId"=${turn.businessId} AND revision=${turn.revision} FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "WhatsAppConversation" WHERE id=${turn.conversationId} AND "businessId"=${turn.businessId} FOR UPDATE`);
    const jobId = randomUUID();
    // The pre-send guard also covers messages/assignments arriving during generation.
    if (!active[0]?.enabled) { await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppBotTurn" SET status='skipped',reason='CONFIGURATION_CHANGED',"completedAt"=CURRENT_TIMESTAMP WHERE "messageId"=${turn.messageId}`); return; }
    await tx.whatsAppReplyJob.create({ data: { id: jobId, businessId: turn.businessId, connectionId: turn.connectionId, conversationId: turn.conversationId, phoneNumberId: turn.phoneNumberId, idempotencyKey: createHash("sha256").update(`infro:bot:${turn.businessId}:${turn.messageId}`).digest("hex"), textBody: answer.reply, nextAttemptAt: new Date() } });
    await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppBotTurn" SET status=${answer.handoff ? "handoff" : "queued"},"replyJobId"=${jobId},"completedAt"=CURRENT_TIMESTAMP WHERE "messageId"=${turn.messageId} AND "businessId"=${turn.businessId} AND status='processing'`);
    if (answer.handoff) await tx.$executeRaw(Prisma.sql`INSERT INTO "WhatsAppBotHandoff" ("conversationId","businessId") VALUES (${turn.conversationId},${turn.businessId}) ON CONFLICT ("conversationId") DO UPDATE SET active=true,"createdAt"=CURRENT_TIMESTAMP WHERE "WhatsAppBotHandoff"."businessId"=${turn.businessId}`);
    await writeWhatsAppAuditLog({ database: tx, businessId: turn.businessId, actorType: "worker", action: answer.handoff ? "bot.handoff" : "bot.reply_queued", targetType: "conversation", targetId: turn.conversationId, outcome: "success" });
  });
  return { processed: true, result: answer.handoff ? "handoff" : "queued" };
}
