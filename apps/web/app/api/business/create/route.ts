import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentUserForApiWrite } from "../../../lib/auth";
import { businessSchema } from "../../../lib/validation";
import { isValidPublicSlug, normalizePublicSlug } from "../../../lib/public-url";
import { getPlanEntitlements } from "../../../lib/plan-entitlements";

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap = { FREE: "Free", BUSINESS: "Business", PRO: "Pro" } as const;
  const planPriceMap = { FREE: 0, BUSINESS: 199, PRO: 399 } as const;
  const productLimit = getPlanEntitlements(code).productLimit ?? 999999;
  const existing = await db.businessPlan.findUnique({ where: { code } });
  if (existing) {
    if (existing.productLimit !== productLimit) {
      return db.businessPlan.update({ where: { id: existing.id }, data: { productLimit } });
    }
    return existing;
  }
  return db.businessPlan.create({
    data: {
      code,
      name: planNameMap[code],
      monthlyPrice: planPriceMap[code],
      productLimit,
      aiEnabled: code !== "FREE",
      onlinePay: code !== "FREE",
      isActive: true,
    },
  });
}

type CreateBusinessPayload = {
  name?: string;
  slug?: string;
  businessType?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  entityType?: string;
  businessCategory?: string;
  onboardingStep?: string;
};

function normalize(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function generatedPublicSlug() {
  return `business-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول بحساب صالح" }, { status: 401 });

  const existingBusiness = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (existingBusiness) {
    return NextResponse.json({ error: "يوجد نشاط مرتبط بهذا الحساب بالفعل" }, { status: 409 });
  }

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const requestedSlug = normalizePublicSlug(normalize(body.slug));
  let normalizedSlug = requestedSlug || generatedPublicSlug();
  const payload = {
    name: normalize(body.name),
    slug: normalizedSlug,
    businessType: normalize(body.businessType),
    shortDescription: normalize(body.shortDescription),
    description: normalize(body.description),
    city: normalize(body.city),
    whatsapp: normalize(body.whatsapp),
    phone: normalize(body.phone),
    address: normalize(body.address),
    logoUrl: normalize(body.logoUrl),
    primaryColor: "#6f3bd2",
    entityType: normalize(body.entityType),
    businessCategory: normalize(body.businessCategory),
    onboardingCompleted: true,
    onboardingStep: "profile_created",
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة" }, { status: 400 });
  }
  if (!isValidPublicSlug(normalizedSlug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const slugTaken = await db.business.findUnique({ where: { slug: normalizedSlug }, select: { id: true } });
  if (slugTaken) {
    if (requestedSlug) {
      return NextResponse.json({ error: "اسم الرابط مستخدم أو محجوز مسبقاً" }, { status: 409 });
    }

    normalizedSlug = generatedPublicSlug();
    if (!isValidPublicSlug(normalizedSlug)) {
      return NextResponse.json({ error: "تعذر إنشاء رابط عام آمن. أعد المحاولة." }, { status: 409 });
    }
    const retryTaken = await db.business.findUnique({ where: { slug: normalizedSlug }, select: { id: true } });
    if (retryTaken) {
      return NextResponse.json({ error: "تعذر إنشاء رابط عام آمن. أعد المحاولة." }, { status: 409 });
    }
    parsed.data.slug = normalizedSlug;
  }

  const freePlan = await ensureBusinessPlan("FREE");
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      ...parsed.data,
      slug: parsed.data.slug,
      isVerified: false,
      isPublished: false,
      publishedAt: null,
      onboardingCompleted: true,
      onboardingStep: "profile_created",
      planId: freePlan.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return NextResponse.json(
    { business: { id: business.id, slug: business.slug }, redirectTo: "/dashboard?welcome=1" },
    { status: 201 },
  );
}
