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
const PREVIEW_REMINDER_FROM_EMAIL = "INFRO Reminders <reminder@ir.sa>";
const TARGET_OCCURRENCE = new Date("2026-09-06T06:24:00.000Z");

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
    const resendApiKeyConfigured = Boolean(String(process.env.RESEND_API_KEY ?? "").trim());
    const originalFrom = process.env.HEE_FROM_EMAIL;

    // Preview-only execution uses the dedicated Smart Reminders identity. Production remains
    // environment-driven and system transactional mail keeps its existing no-reply sender.
    process.env.HEE_FROM_EMAIL = PREVIEW_REMINDER_FROM_EMAIL;

    // Requeue only the single known failed QA email occurrence. Sent deliveries can never
    // match this predicate, so repeated probe execution cannot duplicate a successful send.
    const requeued = resendApiKeyConfigured
      ? await db.$executeRaw(Prisma.sql`
          UPDATE "SmartReminderDelivery"
          SET "status"='queued', "lastErrorCode"=NULL, "failedAt"=NULL,
              "nextAttemptAt"=CURRENT_TIMESTAMP, "leaseOwner"=NULL, "leaseExpiresAt"=NULL,
              "updatedAt"=CURRENT_TIMESTAMP
          WHERE "channel"='email'
            AND "status"='failed'
            AND "sentAt" IS NULL
            AND "lastErrorCode" IN ('REMINDER_EMAIL_NOT_CONFIGURED','RESEND_HTTP_403')
            AND "occurrenceAt"=${TARGET_OCCURRENCE}
        `)
      : 0;

    const scheduled = await runSmartReminderScheduler({ limit: 250 });
    const delivered = await runSmartReminderDeliveryWorker({ limit: 250 });
    const targetDeliveries = await db.$queryRaw<Array<{
      channel: string;
      status: string;
      lastErrorCode: string | null;
      sentAt: Date | null;
      occurrenceAt: Date;
      providerMessageId: string | null;
    }>>(Prisma.sql`
      SELECT "channel", "status", "lastErrorCode", "sentAt", "occurrenceAt", "providerMessageId"
      FROM "SmartReminderDelivery"
      WHERE "occurrenceAt"=${TARGET_OCCURRENCE}
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (originalFrom === undefined) delete process.env.HEE_FROM_EMAIL;
    else process.env.HEE_FROM_EMAIL = originalFrom;

    return NextResponse.json({
      ok: true,
      resendApiKeyConfigured,
      reminderSender: "reminder@ir.sa",
      requeued,
      scheduled: scheduled.scheduled,
      deduplicated: scheduled.deduplicated,
      skippedMissedOccurrences: scheduled.skippedMissedOccurrences,
      processed: delivered.processed,
      targetDeliveries,
      releaseSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  } catch (error) {
    console.error("[smart-reminders-preview-probe] failed", error);
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_PREVIEW_PROBE_FAILED" }, { status: 500 });
  }
}
