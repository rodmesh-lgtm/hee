import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { operationalErrorCategory } from "../../../lib/operational-error";

import { runSmartReminderDeliveryWorker } from "../../../lib/reminders/delivery-worker";
import { runSmartReminderScheduler } from "../../../lib/reminders/scheduler";
import { isSmartRemindersSchemaReady } from "../../../lib/reminders/schema-readiness";

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let phase = "schema";
  try {
    if (!(await isSmartRemindersSchemaReady())) {
      return NextResponse.json({ ok: false, error: "SMART_REMINDER_SCHEMA_NOT_READY" }, { status: 503 });
    }
    phase = "operations";
    // Queue every due occurrence first, then deliver each queued channel. Both layers are
    // idempotent and use row locks/leases, so overlapping cron invocations remain safe.
    const scheduled = await runSmartReminderScheduler({ limit: 250 });
    const delivered = await runSmartReminderDeliveryWorker({ limit: 250 });

    console.info("[smart-reminders-cron] completed", {
      scheduled: scheduled.scheduled,
      processed: delivered.processed,
      releaseSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
    return NextResponse.json({
      ok: true,
      scheduled: scheduled.scheduled,
      deduplicated: scheduled.deduplicated,
      skippedMissedOccurrences: scheduled.skippedMissedOccurrences,
      processed: delivered.processed,
      releaseSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  } catch (error) {
    const category = operationalErrorCategory(error);
    console.error("[smart-reminders-cron] failed", { phase, category });
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_CRON_FAILED" }, { status: category.startsWith("database_") ? 503 : 500 });
  }
}
