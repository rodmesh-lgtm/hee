import { NextResponse } from "next/server";
import { isReservedPublicSlug, normalizePublicSlug } from "../../../lib/public-url";
import { isBusinessSlugReserved } from "../../../lib/slug-alias";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = normalizePublicSlug(searchParams.get("slug") ?? "");

  if (!slug || slug.length < 4 || /[^a-z0-9-]/.test(slug) || isReservedPublicSlug(slug)) {
    return NextResponse.json({ available: false, message: "الرابط غير صالح" }, { status: 400 });
  }

  try {
    const rate = await consumePublicWriteLimit({
      scope: "slug-check",
      businessId: "public",
      identity: requestClientAddress(request) || "unknown",
      limit: 80,
      windowSeconds: 10 * 60,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { available: false, message: "تم إجراء محاولات كثيرة. حاول بعد قليل." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } },
      );
    }
  } catch (error) {
    console.error("[check-slug] rate_limit_failed", error);
    return NextResponse.json(
      { available: false, message: "تعذر التحقق من الرابط الآن" },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  try {
    const reserved = await isBusinessSlugReserved(slug);
    return NextResponse.json({ available: !reserved, slug });
  } catch (error) {
    console.error("[check-slug] failed to verify slug reservation", error);
    return NextResponse.json({ available: false, message: "تعذر التحقق من الرابط الآن" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
