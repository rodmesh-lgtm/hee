import { NextResponse } from "next/server";
import { getOwnedBusinessForRead } from "../../../../lib/ownership";
import { operationalErrorCategory } from "../../../../lib/operational-error";
import { db } from "../../../../lib/db";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    const business = await getOwnedBusinessForRead("appointments");
    if (!business) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
    if (new URL(request.url).searchParams.get("businessId") !== business.id) return NextResponse.json({ error: "business-changed" }, { status: 409, headers });
    const bookings = await db.booking.findMany({ where: { businessId: business.id }, select: { id: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
    return NextResponse.json({ businessId: business.id, bookings }, { headers });
  } catch (error) {
    const category = operationalErrorCategory(error);
    // Preserve redirects/auth failures and programming errors. Never return an
    // empty successful list for a failed read or leak database exception details.
    if (category !== "database_timeout" && category !== "database_connection") throw error;
    console.warn("[booking-updates] temporarily_unavailable", { category });
    return NextResponse.json({ error: "temporarily-unavailable" }, { status: 503, headers: { ...headers, "Retry-After": "30" } });
  }
}
