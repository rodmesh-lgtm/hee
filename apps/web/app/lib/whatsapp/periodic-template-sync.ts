import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { syncMetaWhatsAppTemplates } from "./template-sync";

// Runs under the existing operations cron lock. One account per cycle bounds
// provider time; oldest attempts first prevent an empty/failing account starving others.
export async function runPeriodicTemplateSync() {
  const due = await db.$queryRaw<Array<{ id: string; businessId: string }>>(Prisma.sql`
    SELECT c."id", c."businessId" FROM "WhatsAppConnection" c
    LEFT JOIN "WhatsAppOperationsHeartbeat" h ON h."id" = 'template-sync:' || c."id"
    WHERE c."provider" = 'meta' AND c."status" = 'connected' AND c."disabledAt" IS NULL
      AND (c."marketingEnabled" = true OR c."bookingEnabled" = true)
      AND (h."lastStartedAt" IS NULL OR h."lastStartedAt" < NOW() - INTERVAL '1 hour'
        OR (h."lastStartedAt" < NOW() - INTERVAL '5 minutes' AND EXISTS (
          SELECT 1 FROM "WhatsAppTemplate" t WHERE t."businessId" = c."businessId"
            AND t."connectionId" = c."id" AND t."status" = 'pending')))
    ORDER BY h."lastStartedAt" ASC NULLS FIRST, c."id" ASC LIMIT 1
  `);
  const connection = due[0];
  if (!connection) return { attempted: 0, succeeded: 0, failed: 0 };
  const id = `template-sync:${connection.id}`;
  const startedAt = new Date();
  await db.whatsAppOperationsHeartbeat.upsert({ where: { id },
    create: { id, lastStartedAt: startedAt, details: { businessId: connection.businessId, state: "running" } },
    update: { lastStartedAt: startedAt, lastErrorCode: null, details: { businessId: connection.businessId, state: "running" } },
  });
  try {
    const result = await syncMetaWhatsAppTemplates({ businessId: connection.businessId, connectionId: connection.id });
    await db.whatsAppOperationsHeartbeat.update({ where: { id }, data: { lastSucceededAt: new Date(), lastErrorCode: null,
      details: { businessId: connection.businessId, state: "succeeded", synced: result.synced, pending: result.pending, approved: result.approved } } });
    return { attempted: 1, succeeded: 1, failed: 0 };
  } catch {
    await db.whatsAppOperationsHeartbeat.update({ where: { id }, data: { lastFailedAt: new Date(), lastErrorCode: "META_TEMPLATE_PERIODIC_SYNC_FAILED", details: { businessId: connection.businessId, state: "failed" } } });
    // Failure stays visible in the heartbeat, without stopping other tenants' queues.
    return { attempted: 1, succeeded: 0, failed: 1 };
  }
}
