import { NextResponse } from "next/server";
import { getOwnedBusinessForRead } from "../../../../lib/ownership";
import { db } from "../../../../lib/db";

export async function GET(request: Request) {
  const business = await getOwnedBusinessForRead("appointments");
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!business) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  if (new URL(request.url).searchParams.get("businessId") !== business.id) return NextResponse.json({ error: "business-changed" }, { status: 409, headers });
  const bookings = await db.booking.findMany({ where: { businessId: business.id }, select: { id: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  return NextResponse.json({ businessId: business.id, bookings }, { headers });
}
