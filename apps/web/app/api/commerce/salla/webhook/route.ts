import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import { db } from "../../../../lib/db";
import { readBoundedText } from "../../../../lib/request-body";
import { getSallaConfig } from "../../../../lib/commerce/salla-config";
import { processNextSallaWebhookEvent } from "../../../../lib/commerce/salla-webhook-processor";
import { sallaEventType, sallaMerchantId, sallaWebhookEventId, verifySallaWebhookSignature } from "../../../../lib/commerce/salla-domain";

const MAX_BYTES = 512 * 1024;

export async function POST(request: Request) {
  if (!String(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }
  let config;
  try { config = getSallaConfig(); } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  let rawBody: string;
  try { rawBody = await readBoundedText(request, MAX_BYTES); } catch { return NextResponse.json({ ok: false }, { status: 413 }); }
  const signature = request.headers.get("x-salla-signature") ?? request.headers.get("salla-signature");
  if (!verifySallaWebhookSignature(rawBody, signature, config.SALLA_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const merchantId = sallaMerchantId(payload);
  const eventType = sallaEventType(payload);
  if (!/^\d{1,32}$/.test(merchantId) || !eventType) return NextResponse.json({ ok: false }, { status: 400 });
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { provider: "salla", externalStoreId: merchantId, status: "active" },
    select: { id: true, businessId: true },
  });
  if (!integration) return NextResponse.json({ ok: false }, { status: 404 });
  const eventId = sallaWebhookEventId(rawBody, merchantId, request.headers.get("x-salla-event-id"));
  await db.sallaWebhookEvent.upsert({
    where: { eventId },
    update: {},
    create: {
      id: randomUUID(),
      businessId: integration.businessId,
      integrationId: integration.id,
      eventId,
      eventType,
      merchantId,
      payload: payload as object,
    },
  });
  await db.whatsAppCommerceIntegration.updateMany({
    where: { id: integration.id, businessId: integration.businessId, status: "active" },
    data: { lastWebhookAt: new Date(), lastErrorCode: null },
  });
  after(async () => {
    try { await processNextSallaWebhookEvent({ workerId: `salla-webhook-${randomUUID()}` }); }
    catch (error) { console.error("[salla-webhook] deferred_processing_failed", error instanceof Error ? error.message : "unknown"); }
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}
