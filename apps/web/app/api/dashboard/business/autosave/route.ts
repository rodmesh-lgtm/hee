import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnedBusinessForApiWrite } from "../../../../lib/ownership";
import { db } from "../../../../lib/db";
import { normalizeGoogleMapsUrl } from "../../../../lib/google-maps-url";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";

const schema = z.object({ fields: z.object({ name: z.string().trim().min(2).max(120).optional(), shortDescription: z.string().trim().max(160).optional(), description: z.string().trim().max(4000).optional(), whatsapp: z.string().trim().max(40).optional(), phone: z.string().trim().max(40).optional(), city: z.string().trim().max(80).optional(), district: z.string().trim().max(80).optional(), googleMapsLink: z.string().trim().max(500).optional() }).strict() }).strict();

export async function POST(request: Request) {
  const business = await getOwnedBusinessForApiWrite();
  if (!business) return NextResponse.json({ error: "يرجى تسجيل الدخول وإنشاء النشاط أولاً" }, { status: 401 });

  // Autosave can fire repeatedly while typing. Keep normal editing fluid while bounding
  // accidental loops or abusive authenticated clients before they create sustained DB load.
  try {
    const identity = requestClientAddress(request) || business.ownerId;
    const rate = await consumePublicWriteLimit({ scope: "dashboard-business-autosave", businessId: business.id, identity, limit: 100, windowSeconds: 10 * 60 });
    if (!rate.allowed) return NextResponse.json({ error: "تم إرسال تحديثات كثيرة خلال وقت قصير. انتظر قليلاً ثم تابع." }, { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } });
  } catch (error) {
    console.error("[business-autosave] rate_limit_failed", { businessId: business.id, error });
    return NextResponse.json({ error: "تعذر حفظ التعديل الآن. حاول مرة أخرى بعد قليل." }, { status: 503, headers: { "Retry-After": "30" } });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  const fields = parsed.data.fields;

  if (business.isPublished) {
    const nextWhatsapp = typeof fields.whatsapp === "string" ? fields.whatsapp.trim() : business.whatsapp?.trim();
    const nextPhone = typeof fields.phone === "string" ? fields.phone.trim() : business.phone?.trim();
    if (!Boolean(nextWhatsapp || nextPhone || business.email?.trim() || business.website?.trim())) return NextResponse.json({ error: "لا يمكن حذف آخر وسيلة تواصل من صفحة منشورة. أضف وسيلة أخرى أو ألغِ النشر أولاً." }, { status: 400 });
  }

  const updates: Prisma.BusinessUpdateInput = {};
  const changedKeys: string[] = [];
  if (typeof fields.name === "string" && fields.name !== business.name) { updates.name = fields.name; changedKeys.push("name"); }
  if (typeof fields.shortDescription === "string" && fields.shortDescription !== (business.shortDescription ?? "")) { updates.shortDescription = fields.shortDescription || null; changedKeys.push("shortDescription"); }
  if (typeof fields.description === "string" && fields.description !== (business.description ?? "")) { updates.description = fields.description || null; changedKeys.push("description"); }
  if (typeof fields.whatsapp === "string" && fields.whatsapp !== (business.whatsapp ?? "")) { updates.whatsapp = fields.whatsapp || null; changedKeys.push("whatsapp"); }
  if (typeof fields.phone === "string" && fields.phone !== (business.phone ?? "")) { updates.phone = fields.phone || null; changedKeys.push("phone"); }
  if (typeof fields.city === "string" && fields.city !== (business.city ?? "")) { updates.city = fields.city || null; changedKeys.push("city"); }
  if (typeof fields.district === "string" && fields.district !== (business.district ?? "")) { updates.district = fields.district || null; changedKeys.push("district"); }
  if (typeof fields.googleMapsLink === "string") { const normalized = normalizeGoogleMapsUrl(fields.googleMapsLink); if (fields.googleMapsLink.trim() && !normalized) return NextResponse.json({ error: "استخدم رابط Google Maps صالحًا" }, { status: 400 }); if (normalized !== business.googleMapsLink) { updates.googleMapsLink = normalized; changedKeys.push("googleMapsLink"); } }
  if (!changedKeys.length) return NextResponse.json({ ok: true, changedKeys: [] });

  try {
    const updated = await db.business.updateMany({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, data: updates });
    if (updated.count !== 1) return NextResponse.json({ error: "تعذر العثور على النشاط أو لم يعد متاحًا للتعديل" }, { status: 409 });
  } catch (error) {
    console.error("[business-autosave] write_failed", { businessId: business.id, changedKeys, error });
    return NextResponse.json({ error: "تعذر حفظ التعديل الآن. حاول مرة أخرى بعد قليل." }, { status: 503, headers: { "Retry-After": "30" } });
  }

  revalidatePath("/dashboard"); revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${business.slug}`);
  return NextResponse.json({ ok: true, changedKeys });
}
