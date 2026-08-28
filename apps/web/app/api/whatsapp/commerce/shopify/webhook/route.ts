import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { readBoundedText } from "../../../../../lib/request-body";
import { getShopifyConfig } from "../../../../../lib/whatsapp/shopify-config";
import { normalizeShopifyDomain, verifyShopifyWebhookHmac } from "../../../../../lib/whatsapp/shopify-domain";

const MAX_BYTES = 512 * 1024;
const bounded = (value: string | null, max: number) => value && value.length <= max ? value : null;

export async function POST(request: Request) {
  if (!String(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return NextResponse.json({ ok: false }, { status: 415 });
  let config;
  try { config = getShopifyConfig(); } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  let rawBody: string;
  try { rawBody = await readBoundedText(request, MAX_BYTES); } catch { return NextResponse.json({ ok: false }, { status: 413 }); }
  if (!verifyShopifyWebhookHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"), config.SHOPIFY_CLIENT_SECRET)) return NextResponse.json({ ok: false }, { status: 401 });

  const webhookId = bounded(request.headers.get("x-shopify-webhook-id"), 128);
  const topic = bounded(request.headers.get("x-shopify-topic"), 100);
  const apiVersion = bounded(request.headers.get("x-shopify-api-version"), 20);
  const eventId = bounded(request.headers.get("x-shopify-event-id"), 128);
  let shop: string;
  try { shop = normalizeShopifyDomain(request.headers.get("x-shopify-shop-domain") ?? ""); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!webhookId || !topic || !apiVersion) return NextResponse.json({ ok: false }, { status: 400 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ ok: false }, { status: 400 });

  const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { provider: "shopify", externalStoreId: shop, status: "active" }, select: { id: true, businessId: true } });
  if (!integration) return NextResponse.json({ ok: false }, { status: 404 });
  const triggered = request.headers.get("x-shopify-triggered-at");
  const triggeredAt = triggered && !Number.isNaN(Date.parse(triggered)) ? new Date(triggered) : null;
  await db.whatsAppShopifyWebhookEvent.upsert({
    where: { webhookId }, update: {},
    create: { id: randomUUID(), businessId: integration.businessId, integrationId: integration.id, webhookId, topic: topic.toLowerCase(), eventId, apiVersion, triggeredAt, payload: payload as object },
  });
  await db.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: integration.businessId }, data: { lastWebhookAt: new Date(), lastErrorCode: null } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
