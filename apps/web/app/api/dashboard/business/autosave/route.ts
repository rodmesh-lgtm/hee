import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnedBusinessForApiWrite } from "../../../../lib/ownership";
import { db } from "../../../../lib/db";

const schema = z.object({
  fields: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    shortDescription: z.string().trim().max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(40).optional(),
    city: z.string().trim().max(80).optional(),
    district: z.string().trim().max(80).optional(),
    googleMapsLink: z.string().trim().max(500).optional(),
  }).strict(),
}).strict();

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:/i.test(value)) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname || /\s/.test(url.href)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const business = await getOwnedBusinessForApiWrite();
  if (!business) return NextResponse.json({ error: "يرجى تسجيل الدخول وإنشاء النشاط أولاً" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });

  const updates: Record<string, string | null> = {};
  const changedKeys: string[] = [];
  const fields = parsed.data.fields;

  const assign = (key: keyof typeof fields, current: string | null | undefined) => {
    const value = fields[key];
    if (typeof value !== "string" || value === (current ?? "")) return;
    updates[key] = value;
    changedKeys.push(key);
  };

  assign("name", business.name);
  assign("shortDescription", business.shortDescription);
  assign("description", business.description);
  assign("whatsapp", business.whatsapp);
  assign("phone", business.phone);
  assign("city", business.city);
  assign("district", business.district);

  if (typeof fields.googleMapsLink === "string") {
    const normalized = normalizeUrl(fields.googleMapsLink);
    if (fields.googleMapsLink.trim() && !normalized) {
      return NextResponse.json({ error: "رابط Google Maps غير صالح" }, { status: 400 });
    }
    if (normalized !== business.googleMapsLink) {
      updates.googleMapsLink = normalized;
      changedKeys.push("googleMapsLink");
    }
  }

  if (!changedKeys.length) return NextResponse.json({ ok: true, changedKeys: [] });

  await db.business.update({ where: { id: business.id }, data: updates });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return NextResponse.json({ ok: true, changedKeys });
}
