import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isReservedPublicSlug, normalizePublicSlug } from "../../../lib/public-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = normalizePublicSlug(searchParams.get("slug") ?? "");

  if (!slug || slug.length < 4 || /[^a-z0-9-]/.test(slug) || isReservedPublicSlug(slug)) {
    return NextResponse.json({ available: false, message: "الرابط غير صالح" }, { status: 400 });
  }

  const existing = await db.business.findUnique({ where: { slug } });
  return NextResponse.json({ available: !existing, slug });
}
