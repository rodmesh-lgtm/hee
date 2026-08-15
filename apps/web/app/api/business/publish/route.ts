import { NextResponse } from "next/server";
import { getCurrentUserForWrites } from "../../../lib/auth";
import { db } from "../../../lib/db";
import {
  getPublicBusinessUrlFromRequest,
  isReservedPublicSlug,
  normalizePublicSlug,
} from "../../../lib/public-url";

export async function POST(request: Request) {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  let body: { name?: string; description?: string; whatsapp?: string; slug?: string; logoUrl?: string; entityType?: string; businessCategory?: string; city?: string; onboardingStep?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const description = (body.description ?? "").trim();
  const whatsapp = (body.whatsapp ?? "").trim();
  const requestedSlug = normalizePublicSlug(body.slug ?? name);

  if (!name || !description || !whatsapp || !requestedSlug) {
    return NextResponse.json({ error: "يرجى إكمال الاسم والنبذة ورقم واتساب والرابط قبل النشر." }, { status: 400 });
  }

  if (requestedSlug.length < 4 || isReservedPublicSlug(requestedSlug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id } });
  if (!existingBusiness) {
    return NextResponse.json({ error: "لا يوجد نشاط مرتبط بهذا الحساب" }, { status: 404 });
  }

  const slugConflict = await db.business.findFirst({ where: { slug: requestedSlug, id: { not: existingBusiness.id } } });
  if (slugConflict) {
    return NextResponse.json({ error: "الرابط العام مستخدم من نشاط آخر" }, { status: 409 });
  }

  const updated = await db.business.update({
    where: { id: existingBusiness.id },
    data: {
      name,
      description,
      whatsapp,
      slug: requestedSlug,
      logoUrl: body.logoUrl || existingBusiness.logoUrl,
      entityType: body.entityType || existingBusiness.entityType,
      businessCategory: body.businessCategory || existingBusiness.businessCategory,
      city: body.city || existingBusiness.city,
      isPublished: true,
      publishedAt: new Date(),
      onboardingCompleted: true,
      onboardingStep: body.onboardingStep || "published",
    },
  });

  const publicUrl = await getPublicBusinessUrlFromRequest(updated.slug);

  return NextResponse.json({ success: true, publicUrl, business: updated }, { status: 200 });
}
