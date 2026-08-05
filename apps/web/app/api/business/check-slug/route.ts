import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ available: false, message: "الرابط غير صالح" }, { status: 400 });
  }

  const existing = await db.business.findUnique({ where: { slug } });
  return NextResponse.json({ available: !existing, slug });
}
