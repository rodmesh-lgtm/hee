import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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

  if (!(await isSmartRemindersSchemaReady())) {
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_SCHEMA_NOT_READY" }, { status: 503 });
  }

  try {
    // Queue every due occurrence first, then deliver each queued channel. Both layers are
    // idempotent and use row locks/leases, so overlapping cron invocations remain safe.
    const scheduled = await runSmartReminderScheduler({ limit: 250 });
    const delivered = await runSmartReminderDeliveryWorker({ limit: 250 });

    return NextResponse.json({
      ok: true,
      scheduled: scheduled.scheduled,
      deduplicated: scheduled.deduplicated,
      skippedMissedOccurrences: scheduled.skippedMissedOccurrences,
      processed: delivered.processed,
      releaseSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  } catch (error) {
    console.error("[smart-reminders-cron] failed", error);
    return NextResponse.json({ ok: false, error: "SMART_REMINDER_CRON_FAILED" }, { status: 500 });
  }
}
