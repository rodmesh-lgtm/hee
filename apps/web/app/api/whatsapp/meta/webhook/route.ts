import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getMetaWhatsAppConfig } from "../../../../lib/whatsapp/meta-config";
import { verifyMetaWebhookChallenge, verifyMetaWebhookSignature } from "../../../../lib/whatsapp/webhook-security";
import { readBoundedText } from "../../../../lib/request-body";

const MAX_WEBHOOK_BYTES = 512 * 1024;

type MetaChange = { field?: unknown; value?: unknown };
type MetaEntry = { id?: unknown; changes?: unknown };
type MetaWebhook = { object?: unknown; entry?: unknown };

function text(value: unknown, max = 256) {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function extractPhoneNumberId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const metadata = (value as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  return text((metadata as { phone_number_id?: unknown }).phone_number_id, 128);
}

function eventType(change: MetaChange) {
  const field = text(change.field, 80) ?? "unknown";
  const value = change.value;
  if (!value || typeof value !== "object") return field;
  const object = value as { statuses?: unknown; messages?: unknown };
  if (Array.isArray(object.statuses) && object.statuses.length) return "message_status";
  if (Array.isArray(object.messages) && object.messages.length) return "message_received";
  return field;
}

export async function GET(request: Request) {
  let config;
  try {
    config = getMetaWhatsAppConfig();
  } catch {
    return new NextResponse("Unavailable", { status: 503 });
  }
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (!challenge || challenge.length > 512) return new NextResponse("Bad Request", { status: 400 });
  const valid = verifyMetaWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    expectedVerifyToken: config.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  });
  return valid ? new NextResponse(challenge, { status: 200 }) : new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  if (!String(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  let config;
  try {
    config = getMetaWhatsAppConfig();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedText(request, MAX_WEBHOOK_BYTES);
  } catch {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  if (!verifyMetaWebhookSignature({
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
    appSecret: config.META_APP_SECRET,
  })) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: MetaWebhook;
  try {
    payload = JSON.parse(rawBody) as MetaWebhook;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const bodyDigest = createHash("sha256").update(rawBody, "utf8").digest("hex");
  let accepted = 0;
  for (let entryIndex = 0; entryIndex < payload.entry.length; entryIndex += 1) {
    const entry = payload.entry[entryIndex] as MetaEntry;
    const wabaId = text(entry?.id, 128);
    if (!wabaId || !Array.isArray(entry?.changes)) continue;

    for (let changeIndex = 0; changeIndex < entry.changes.length; changeIndex += 1) {
      const change = entry.changes[changeIndex] as MetaChange;
      const phoneNumberId = extractPhoneNumberId(change?.value);
      if (!phoneNumberId) continue;

      const connection = await db.whatsAppConnection.findFirst({
        where: { provider: "meta", wabaId, phoneNumberId, disabledAt: null },
        select: { businessId: true },
      });
      if (!connection) {
        console.warn("[whatsapp-webhook] unresolved_connection", { wabaId, phoneNumberId });
        continue;
      }

      const providerEventId = `${bodyDigest}:${entryIndex}:${changeIndex}`;
      await db.whatsAppWebhookEvent.upsert({
        where: { provider_providerEventId: { provider: "meta", providerEventId } },
        create: {
          id: randomUUID(),
          businessId: connection.businessId,
          provider: "meta",
          providerEventId,
          wabaId,
          phoneNumberId,
          eventType: eventType(change),
          payload: change as object,
        },
        update: {},
      });
      accepted += 1;
    }
  }

  return NextResponse.json({ ok: true, accepted }, { status: 202 });
}
