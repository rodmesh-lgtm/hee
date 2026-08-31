import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";

export const WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS = 20 * 60 * 1000;

type ReadinessDatabase = Pick<PrismaClient, "$queryRaw" | "whatsAppOperationsHeartbeat">;

export type WhatsAppCampaignLaunchReadiness =
  | { ready: true; code: "ready"; lastSucceededAt: Date; releaseSha: string | null }
  | { ready: false; code: "worker_not_started" | "worker_failed" | "worker_stale" | "database_clock_unavailable" };

export async function getWhatsAppCampaignLaunchReadiness(input: {
  database?: ReadinessDatabase;
  maxAgeMs?: number;
} = {}): Promise<WhatsAppCampaignLaunchReadiness> {
  const database = input.database ?? db;
  const maxAgeMs = input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS;
  const [heartbeat, clockRows] = await Promise.all([
    database.whatsAppOperationsHeartbeat.findUnique({
      where: { id: "whatsapp-operations" },
      select: { lastSucceededAt: true, lastErrorCode: true, releaseSha: true },
    }),
    database.$queryRaw<Array<{ currentTime: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS "currentTime"`),
  ]);
  const currentTime = clockRows[0]?.currentTime;
  if (!currentTime) return { ready: false, code: "database_clock_unavailable" };
  if (!heartbeat?.lastSucceededAt) return { ready: false, code: "worker_not_started" };
  if (heartbeat.lastErrorCode) return { ready: false, code: "worker_failed" };
  const ageMs = currentTime.getTime() - heartbeat.lastSucceededAt.getTime();
  if (ageMs < -60_000 || ageMs >= maxAgeMs) return { ready: false, code: "worker_stale" };
  return { ready: true, code: "ready", lastSucceededAt: heartbeat.lastSucceededAt, releaseSha: heartbeat.releaseSha };
}
