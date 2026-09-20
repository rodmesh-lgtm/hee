import { spawn } from "node:child_process";

import type { PrismaClient } from "@prisma/client";

export const WHATSAPP_OPERATION_STAGES = [
  "whatsapp:contact-imports",
  "whatsapp:webhooks",
  "whatsapp:shopify-subscriptions",
  "whatsapp:shopify-webhooks",
  "whatsapp:salla-webhooks",
  "whatsapp:commerce-periodic-sync",
  "whatsapp:shopify-abandoned-carts",
  "whatsapp:campaigns",
  "whatsapp:deliveries",
  "whatsapp:replies",
  "whatsapp:automation-schedules",
  "whatsapp:automations",
  "whatsapp:automation-deliveries",
  "whatsapp:reminder-schedules",
  "whatsapp:reminder-deliveries",
] as const;

type StageName = (typeof WHATSAPP_OPERATION_STAGES)[number];
type OperationsDatabase = Pick<PrismaClient, "whatsAppOperationsHeartbeat">;

// Commerce maintenance does not grant permission to process outbound queues.
export const COMMERCE_OPERATION_STAGES: readonly StageName[] = [
  "whatsapp:shopify-subscriptions",
  "whatsapp:shopify-webhooks",
  "whatsapp:salla-webhooks",
  "whatsapp:commerce-periodic-sync",
];

function fullOperationsEnabled(env: NodeJS.ProcessEnv) {
  return env.WHATSAPP_MARKETING_WORKER_ENABLED === "true"
    || env.INFRO_BOOKING_WORKER_ENABLED === "true";
}

function releaseSha(env: NodeJS.ProcessEnv) {
  const value = String(env.RELEASE_SHA ?? "").trim().toLowerCase();
  if (/^[0-9a-f]{40}$/.test(value)) return value;
  if (env.NODE_ENV === "production") throw new Error("WHATSAPP_RELEASE_SHA_REQUIRED");
  return null;
}

function stageErrorCode(stage: StageName) {
  return `WHATSAPP_${stage.slice("whatsapp:".length).replaceAll("-", "_").toUpperCase()}_FAILED`;
}

export function whatsappOperationsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return fullOperationsEnabled(env) || env.INFRO_COMMERCE_WORKER_ENABLED === "true";
}

export function runNpmStage(stage: StageName, env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "--silent", stage], { env, stdio: "inherit", shell: false });
    child.once("error", () => reject(new Error(stageErrorCode(stage))));
    child.once("exit", (code, signal) => {
      if (code === 0 && signal === null) resolve();
      else reject(new Error(stageErrorCode(stage)));
    });
  });
}

export async function runWhatsAppOperations(input: {
  database: OperationsDatabase;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  runStage?: (stage: StageName, env: NodeJS.ProcessEnv) => Promise<void>;
}) {
  const env = input.env ?? process.env;
  if (!whatsappOperationsEnabled(env)) return { enabled: false as const, completedStages: [] as StageName[] };
  const sha = releaseSha(env);
  const now = input.now ?? (() => new Date());
  const startedAt = now();
  const completedStages: StageName[] = [];
  const failedStages: StageName[] = [];
  const stages = fullOperationsEnabled(env) ? WHATSAPP_OPERATION_STAGES : COMMERCE_OPERATION_STAGES;
  const mode = fullOperationsEnabled(env) ? "full" : "commerce";
  await input.database.whatsAppOperationsHeartbeat.upsert({
    where: { id: "whatsapp-operations" },
    create: { id: "whatsapp-operations", lastStartedAt: startedAt, releaseSha: sha, details: { state: "running", mode, completedStages } },
    update: { lastStartedAt: startedAt, releaseSha: sha, lastErrorCode: null, details: { state: "running", mode, completedStages } },
  });
  const runStage = input.runStage ?? runNpmStage;
  for (const stage of stages) {
    try { await runStage(stage, env); completedStages.push(stage); } catch { failedStages.push(stage); }
  }
  if (failedStages.length > 0) {
    const failedAt = now();
    const errorCode = failedStages.length === 1 ? stageErrorCode(failedStages[0]) : "WHATSAPP_MULTIPLE_STAGES_FAILED";
    await input.database.whatsAppOperationsHeartbeat.update({
      where: { id: "whatsapp-operations" },
      data: { lastFailedAt: failedAt, lastErrorCode: errorCode, details: { state: "failed", mode, failedStages, completedStages } },
    });
    throw new Error(errorCode);
  }
  const succeededAt = now();
  await input.database.whatsAppOperationsHeartbeat.update({
    where: { id: "whatsapp-operations" },
    data: { lastSucceededAt: succeededAt, lastErrorCode: null, details: { state: "succeeded", mode, completedStages } },
  });
  return { enabled: true as const, completedStages, releaseSha: sha, succeededAt };
}
