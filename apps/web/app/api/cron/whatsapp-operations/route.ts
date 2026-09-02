import { timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "../../../lib/db";
import { runWhatsAppOperations } from "../../../lib/whatsapp/operations-worker";
import { runVercelWhatsAppStage } from "../../../lib/whatsapp/vercel-operations-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = String(process.env.CRON_SECRET ?? "");
  if (secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function acquireLease() {
  const rows = await db.$queryRaw<Array<{ acquired: boolean }>>(Prisma.sql`
    WITH lease AS (
      INSERT INTO "WhatsAppOperationsHeartbeat" (
        "id", "lastStartedAt", "details", "createdAt", "updatedAt"
      ) VALUES (
        'whatsapp-operations', CURRENT_TIMESTAMP, '{"state":"leased"}'::jsonb,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "lastStartedAt" = EXCLUDED."lastStartedAt",
        "details" = EXCLUDED."details",
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE COALESCE("WhatsAppOperationsHeartbeat"."details"->>'state', '') NOT IN ('leased', 'running')
         OR "WhatsAppOperationsHeartbeat"."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
      RETURNING 1
    )
    SELECT EXISTS(SELECT 1 FROM lease) AS acquired
  `);
  return rows[0]?.acquired === true;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (process.env.WHATSAPP_MARKETING_WORKER_ENABLED !== "true") {
    return NextResponse.json({ ok: true, enabled: false });
  }
  if (!(await acquireLease())) return NextResponse.json({ ok: true, enabled: true, busy: true });

  const env = {
    ...process.env,
    RELEASE_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA,
  };
  try {
    const result = await runWhatsAppOperations({ database: db, env, runStage: runVercelWhatsAppStage });
    return NextResponse.json({
      ok: true,
      enabled: result.enabled,
      completedStages: result.completedStages.length,
      releaseSha: "releaseSha" in result ? result.releaseSha : null,
    });
  } catch (error) {
    const errorCode = error instanceof Error && /^[A-Z0-9_]{1,100}$/.test(error.message)
      ? error.message
      : "WHATSAPP_OPERATIONS_FAILED";
    return NextResponse.json({ ok: false, error: errorCode }, { status: 500 });
  }
}
