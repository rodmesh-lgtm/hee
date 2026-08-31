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

function runtimeReleaseSha(env: NodeJS.ProcessEnv = process.env) {
  const value = String(env.VERCEL_GIT_COMMIT_SHA ?? env.RELEASE_SHA ?? "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
}

function normalizeReleaseSha(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

export async function getWhatsAppCampaignLaunchReadiness(input: {
  database?: ReadinessDatabase;
  maxAgeMs?: number;
  expectedReleaseSha?: string | null;
} = {}): Promise<WhatsAppCampaignLaunchReadiness> {
  const database = input.database ?? db;
  const expectedReleaseSha = input.expectedReleaseSha === undefined
    ? runtimeReleaseSha()
    : normalizeReleaseSha(input.expectedReleaseSha);
  const [heartbeat, clockRows] = await Promise.all([
    database.whatsAppOperationsHeartbeat.findUnique({
      where: { id: "whatsapp-operations" },
      select: { lastSucceededAt: true, lastErrorCode: true, releaseSha: true },
    }),
    database.$queryRaw<Array<{ currentTime: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS "currentTime"`),
  ]);
  return evaluateWhatsAppCampaignLaunchReadiness({
    currentTime: clockRows[0]?.currentTime,
    expectedReleaseSha,
    heartbeat,
    maxAgeMs: input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS,
  });
}
