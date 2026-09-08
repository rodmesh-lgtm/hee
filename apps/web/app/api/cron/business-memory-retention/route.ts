import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runBusinessMemoryRetention } from "../../../lib/business-memory/retention";
import { isBusinessNotesSchemaReady } from "../../../lib/business-notes/schema-readiness";
import { isSmartRemindersSchemaReady } from "../../../lib/reminders/schema-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const expected = String(process.env.CRON_SECRET ?? "").trim();
  const supplied = String(request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!await isSmartRemindersSchemaReady() || !await isBusinessNotesSchemaReady()) {
    return NextResponse.json({ ok: false, error: "BUSINESS_MEMORY_SCHEMA_NOT_READY" }, { status: 503 });
  }
  try {
    const deleted = await runBusinessMemoryRetention();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("[business-memory-retention] failed", error);
    return NextResponse.json({ ok: false, error: "BUSINESS_MEMORY_RETENTION_FAILED" }, { status: 500 });
  }
}
