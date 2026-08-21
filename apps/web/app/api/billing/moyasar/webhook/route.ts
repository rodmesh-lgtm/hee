import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { processMoyasarWebhookEvent } from "../../../../lib/moyasar-webhook-processing";
import { verifyMoyasarWebhookSecret, type MoyasarWebhook } from "../../../../lib/moyasar";
import { readBoundedText } from "../../../../lib/request-body";

const MAX_WEBHOOK_BYTES = 128 * 1024;

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function validPaymentId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

async function persistEvent(event: MoyasarWebhook, providerPaymentId: string) {
  const id = randomUUID();
  const rows = await db.$queryRaw<Array<{
    id: string;
    processedAt: Date | null;
    providerPaymentId: string | null;
  }>>`
    INSERT INTO "BillingWebhookEvent" (
      "id", "provider", "providerEventId", "eventType", "providerPaymentId", "createdAt"
    ) VALUES (
      ${id}, 'moyasar', ${event.id}, ${event.type}, ${providerPaymentId}, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("provider", "providerEventId")
    DO UPDATE SET "eventType" = EXCLUDED."eventType"
    RETURNING "id", "processedAt", "providerPaymentId"
  `;
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  if (!String(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  let body: string;
  try {
    body = await readBoundedText(request, MAX_WEBHOOK_BYTES);
  } catch {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let event: MoyasarWebhook;
  try {
    event = JSON.parse(body) as MoyasarWebhook;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!validText(event.id, 128) || !validText(event.type, 80) || !verifyMoyasarWebhookSecret(event.secret_token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const production = String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";
  if ((production && event.live !== true) || (!production && event.live === true)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!event.type.startsWith("payment_")) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const providerPaymentId = String(event.data?.id ?? "").trim();
  if (!validPaymentId(providerPaymentId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let persisted: Awaited<ReturnType<typeof persistEvent>>;
  try {
    persisted = await persistEvent(event, providerPaymentId);
  } catch (error) {
    console.error("[moyasar-webhook] inbox_persist_failed", {
      eventId: event.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!persisted) return NextResponse.json({ ok: false }, { status: 503 });
  if (persisted.providerPaymentId && persisted.providerPaymentId !== providerPaymentId) {
    console.error("[moyasar-webhook] provider_event_collision", { eventId: event.id });
    return NextResponse.json({ ok: false }, { status: 409 });
  }
  if (persisted.processedAt) return NextResponse.json({ ok: true, duplicate: true });

  // Moyasar explicitly requires a quick 2xx acknowledgement before complex logic.
  // The event is already durable in PostgreSQL. `after` gives a fast best-effort pass;
  // the billing operations worker retries any row left unprocessed after runtime loss.
  after(async () => {
    await processMoyasarWebhookEvent(persisted.id);
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
