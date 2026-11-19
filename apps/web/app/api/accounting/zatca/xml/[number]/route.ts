import { getActiveBusinessForUser } from "../../../../../lib/active-business";
import { getCurrentUser } from "../../../../../lib/auth";
import { cashierTaxNumber } from "../../../../../lib/cashier-tax";
import { db } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^[1-9][0-9]{0,9}$/.test(number) || Number(number) > 2147483647) return new Response(null, { status: 404 });
  const user = await getCurrentUser();
  const business = user && await getActiveBusinessForUser(user.id, "laundry");
  if (!business || business.ownerId !== user.id) return new Response(null, { status: 404 });
  const [document] = await db.$queryRaw<Array<{ xml: string }>>`
    SELECT COALESCE("clearedXml",xml) AS xml FROM "CashierZatcaReport"
    WHERE "businessId"=${business.id} AND number=${Number(number)} AND (buyer IS NULL OR status='reported')`;
  if (!document) return new Response(null, { status: 404 });
  return new Response(document.xml, { headers: {
    "Content-Type": "application/xml; charset=utf-8",
    "Content-Disposition": `attachment; filename="${cashierTaxNumber(Number(number))}.xml"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
