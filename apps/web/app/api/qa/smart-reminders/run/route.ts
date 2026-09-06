import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "../../../../lib/db";
import { runSmartReminderDeliveryWorker } from "../../../../lib/reminders/delivery-worker";
import { runSmartReminderScheduler } from "../../../../lib/reminders/scheduler";
import { isSmartRemindersSchemaReady } from "../../../../lib/reminders/schema-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const APPROVED_PREVIEW_REF = "infro-business-memory-2026";
const CONFIRM_VALUE = "run-due-reminders";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== APPROVED_PREVIEW_REF) {
    return NextResponse.json({ ok: false, error: "PREVIEW_ONLY" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== CONFIRM_VALUE) {
    return NextResponse.json({ ok: false, error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  }

  if (!(await isSmartRemindersSchemaReady())) {
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_SCHEMA_NOT_READY" }, { status: 503 });
  }

  try {
    const scheduled = await runSmartReminderScheduler({ limit: 250 });
    const delivered = await runSmartReminderDeliveryWorker({ limit: 250 });
    const recentDeliveries = await db.$queryRaw<Array<{
      channel: string;
      status: string;
      lastErrorCode: string | null;
      sentAt: Date | null;
      occurrenceAt: Date;
    }>>(Prisma.sql`
      SELECT "channel", "status", "lastErrorCode", "sentAt", "occurrenceAt"
      FROM "SmartReminderDelivery"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      ORDER BY "createdAt" DESC
      LIMIT 20
    `);

    return NextResponse.json({
      ok: true,
      scheduled: scheduled.scheduled,
      deduplicated: scheduled.deduplicated,
      skippedMissedOccurrences: scheduled.skippedMissedOccurrences,
      processed: delivered.processed,
      recentDeliveries,
      releaseSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  } catch (error) {
    console.error("[smart-reminders-preview-probe] failed", error);
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_PREVIEW_PROBE_FAILED" }, { status: 500 });
  }
}
