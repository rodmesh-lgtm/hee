import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getOwnedBusinessForApiWrite } from "../../../lib/ownership";
import {
  getPublicBusinessUrlFromRequest,
  isValidPublicSlug,
  normalizePublicSlug,
} from "../../../lib/public-url";

export async function POST(request: Request) {
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
  if (!isValidPublicSlug(requestedSlug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const existingBusiness = await getOwnedBusinessForApiWrite();
  if (!existingBusiness) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول بحساب مالك النشاط" }, { status: 401 });
  }

  // Business.slug is globally unique, including soft-deleted historical rows.
  const slugConflict = await db.business.findFirst({
    where: { slug: requestedSlug, id: { not: existingBusiness.id } },
    select: { id: true },
  });
  if (slugConflict) {
    return NextResponse.json({ error: "الرابط العام مستخدم أو محجوز مسبقاً" }, { status: 409 });
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
      publishedAt: existingBusiness.publishedAt ?? new Date(),
      onboardingCompleted: true,
      onboardingStep: body.onboardingStep || "published",
    },
  });

  const publicUrl = await getPublicBusinessUrlFromRequest(updated.slug);
  return NextResponse.json({ success: true, publicUrl, business: updated }, { status: 200 });
}
