import { timingSafeEqual } from "node:crypto";
import { runCashierZatcaReports } from "../../../lib/cashier-zatca-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (secret.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  return Response.json({ ok: true, ...await runCashierZatcaReports() });
}
