import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";

const ALLOWED_EVENTS = new Set(["page_view", "whatsapp_click", "phone_click", "share_click", "website_click", "map_click", "company_profile_click", "social_click"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readBoundedJson(request, 8 * 1024);
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }

  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as { slug?: unknown; eventType?: unknown }
    : {};
  const slug = normalizePublicSlug(String(payload.slug ?? ""));
  const eventType = String(payload.eventType ?? "").trim();
  if (!slug || !ALLOWED_EVENTS.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const business = await db.business.findFirst({
      where: {
        slug,
        deletedAt: null,
        isPublished: true,
        owner: { deletedAt: null, emailVerifiedAt: { not: null } },
      },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ ok: false }, { status: 404 });

    const rate = await consumePublicWriteLimit({
      scope: `public-analytics-${eventType}`,
      businessId: business.id,
      identity: requestClientAddress(request) || "unknown",
      limit: eventType === "page_view" ? 100 : 40,
      windowSeconds: 600,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false },
        { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } },
      );
    }

    await db.analyticsEvent.create({ data: { businessId: business.id, eventType } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[public-analytics] write_failed", { slug, eventType, error });
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
