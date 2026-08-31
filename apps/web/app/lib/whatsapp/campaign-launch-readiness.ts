import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import {
  evaluateWhatsAppCampaignLaunchReadiness,
  WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS,
  type WhatsAppCampaignLaunchReadiness,
} from "./campaign-launch-readiness-domain";

export { WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS } from "./campaign-launch-readiness-domain";
export type { WhatsAppCampaignLaunchReadiness } from "./campaign-launch-readiness-domain";

type ReadinessDatabase = Pick<PrismaClient, "$queryRaw" | "whatsAppOperationsHeartbeat">;

export async function getWhatsAppCampaignLaunchReadiness(input: {
  database?: ReadinessDatabase;
  maxAgeMs?: number;
} = {}): Promise<WhatsAppCampaignLaunchReadiness> {
  const database = input.database ?? db;
  const [heartbeat, clockRows] = await Promise.all([
    database.whatsAppOperationsHeartbeat.findUnique({
      where: { id: "whatsapp-operations" },
      select: { lastSucceededAt: true, lastErrorCode: true, releaseSha: true },
    }),
    database.$queryRaw<Array<{ currentTime: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS "currentTime"`),
  ]);
  return evaluateWhatsAppCampaignLaunchReadiness({
    currentTime: clockRows[0]?.currentTime,
    heartbeat,
    maxAgeMs: input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS,
  });
}
