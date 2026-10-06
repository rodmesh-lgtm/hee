import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { operationalErrorCategory } from "../../../lib/operational-error";
import { processNextContactImportBatch } from "../../../lib/whatsapp/contact-import-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Importing an already authorized upload must not depend on outbound enablement.
// The existing processor owns row locks, leases, retries, consent and tenant scope.
export async function GET(request: Request) {
  const secret = String(process.env.CRON_SECRET ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const workerId = `contact-import-cron-${randomUUID()}`;
  const deadline = Date.now() + 240_000;
  let completedBatches = 0;
  let failedBatches = 0;
  try {
    for (let batch = 0; batch < 100 && Date.now() < deadline; batch += 1) {
      const result = await processNextContactImportBatch({ workerId });
      if (result.processed) completedBatches += 1;
      else if ("error" in result) failedBatches += 1;
      else break;
    }
    console.info("[contact-import-cron]", { completedBatches, failedBatches });
    return NextResponse.json({ ok: failedBatches === 0, completedBatches, failedBatches }, { status: failedBatches ? 503 : 200 });
  } catch (error) {
    const category = operationalErrorCategory(error);
    console.error("[contact-import-cron] CONTACT_IMPORT_WORKER_FAILED", { category, completedBatches, failedBatches });
    return NextResponse.json({ ok: false, error: "CONTACT_IMPORT_WORKER_FAILED", completedBatches }, { status: category.startsWith("database_") ? 503 : 500 });
  }
}
