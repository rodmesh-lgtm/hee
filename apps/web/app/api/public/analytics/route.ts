import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";

const ALLOWED_EVENTS = new Set(["page_view", "whatsapp_click", "phone_click", "share_click", "website_click", "map_click"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as { slug?: unknown; eventType?: unknown }
    : {};
  const slug = normalizePublicSlug(String(payload.slug ?? ""));
  const eventType = String(payload.eventType ?? "").trim();
  if (!slug || !ALLOWED_EVENTS.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const business = await db.business.findFirst({ where: { slug, deletedAt: null, isPublished: true }, select: { id: true } });
    if (!business) return NextResponse.json({ ok: false }, { status: 404 });

    const clientAddress = requestClientAddress(request);
    if (clientAddress) {
      const rate = await consumePublicWriteLimit({
        scope: `public-analytics-${eventType}`,
        businessId: business.id,
        identity: clientAddress,
        limit: eventType === "page_view" ? 100 : 40,
        windowSeconds: 600,
      });
      if (!rate.allowed) {
        return NextResponse.json(
          { ok: false },
          { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } },
        );
      }
    }

    await db.analyticsEvent.create({ data: { businessId: business.id, eventType } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // A database outage is not a malformed visitor request. Preserve the distinction
    // so runtime monitoring can detect infrastructure failures instead of hiding them
    // inside a misleading 400 response.
    console.error("[public-analytics] write_failed", { slug, eventType, error });
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
