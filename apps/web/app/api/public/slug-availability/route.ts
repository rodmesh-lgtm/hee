import { NextRequest, NextResponse } from "next/server";
import { isBusinessSlugReserved } from "../../../lib/slug-alias";
import { isReservedPublicSlug, isValidPublicSlug, normalizePublicSlug } from "../../../lib/public-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slug") ?? "";
  const slug = normalizePublicSlug(raw);

  if (!slug) {
    return NextResponse.json({ slug, available: false, reason: "empty" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!isValidPublicSlug(slug) || isReservedPublicSlug(slug)) {
    return NextResponse.json({ slug, available: false, reason: "invalid" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const reserved = await isBusinessSlugReserved(slug);
    return NextResponse.json(
      { slug, available: !reserved, reason: reserved ? "taken" : "available" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { slug, available: false, reason: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
