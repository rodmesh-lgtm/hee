import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runSmartReminderDeliveryWorker } from "../../../lib/reminders/delivery-worker";
import { runSmartReminderScheduler } from "../../../lib/reminders/scheduler";
import { isSmartRemindersSchemaReady } from "../../../lib/reminders/schema-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRANSIENT_DATABASE_ERROR_PATTERNS = [
  "connection terminated",
  "connection timeout",
  "connection terminated unexpectedly",
  "connection reset",
  "econnreset",
  "econnrefused",
  "etimedout",
  "server closed the connection unexpectedly",
];

function isAuthorized(request: Request) {
  const secret = String(process.env.CRON_SECRET ?? "");
  if (secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function errorText(error: unknown) {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let cursor: unknown = error;
  for (let depth = 0; depth < 5 && cursor && !seen.has(cursor); depth += 1) {
    seen.add(cursor);
    if (cursor instanceof Error) parts.push(cursor.message);
    else parts.push(String(cursor));
    cursor = typeof cursor === "object" && cursor !== null && "cause" in cursor
      ? (cursor as { cause?: unknown }).cause
      : undefined;
  }
  return parts.join(" ").toLowerCase();
}

function isTransientDatabaseError(error: unknown) {
  const text = errorText(error);
  return TRANSIENT_DATABASE_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientDatabaseRetry<T>(operation: string, work: () => Promise<T>) {
  const delays = [250, 750];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isTransientDatabaseError(error) || attempt >= delays.length) throw error;
      console.warn(`[smart-reminders-cron] transient database failure; retrying ${operation}`, {
        attempt: attempt + 1,
        delayMs: delays[attempt],
      });
      await sleep(delays[attempt]);
    }
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const schemaReady = await withTransientDatabaseRetry("schema-readiness", () => isSmartRemindersSchemaReady());
    if (!schemaReady) {
      return NextResponse.json({ ok: false, error: "SMART_REMINDER_SCHEMA_NOT_READY" }, { status: 503 });
    }

    // Queue every due occurrence first, then deliver each queued channel. Both layers are
    // idempotent and use row locks/leases, so replaying either operation after a transient
    // database failure cannot create duplicate reminder deliveries.
    const scheduled = await withTransientDatabaseRetry("scheduler", () => runSmartReminderScheduler({ limit: 250 }));
    const delivered = await withTransientDatabaseRetry("delivery-worker", () => runSmartReminderDeliveryWorker({ limit: 250 }));

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
