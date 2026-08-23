import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getActiveBusinessForUser } from "../../../lib/active-business";

function escapeVCard(value: string | null | undefined) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").trim();
}
function safeSlug(value: string) { return value.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-") || "business"; }

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "لا توجد منشأة نشطة" }, { status: 404 });
  const address = [business.address, business.district, business.city, business.country || "SA"].map(escapeVCard);
  const lines = [
    "BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(business.name)}`, `ORG:${escapeVCard(business.name)}`,
    business.phone ? `TEL;TYPE=WORK,VOICE:${escapeVCard(business.phone)}` : "",
    business.whatsapp ? `TEL;TYPE=CELL:${escapeVCard(business.whatsapp)}` : "",
    business.email ? `EMAIL;TYPE=WORK:${escapeVCard(business.email)}` : "",
    `URL:https://hee.sa/${encodeURIComponent(business.slug)}`,
    address.some(Boolean) ? `ADR;TYPE=WORK:;;${address[0]};${address[1]};${address[2]};;${address[3]}` : "",
    business.shortDescription ? `NOTE:${escapeVCard(business.shortDescription)}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
  return new NextResponse(`${lines}\r\n`, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${safeSlug(business.slug)}.vcf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
