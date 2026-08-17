import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentUserForApiWrite } from "../../../lib/auth";
import { businessSchema } from "../../../lib/validation";
import { isValidPublicSlug, normalizePublicSlug } from "../../../lib/public-url";

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap: Record<typeof code, string> = { FREE: "Free", BUSINESS: "Business", PRO: "Pro" };
  const planPriceMap: Record<typeof code, number> = { FREE: 0, BUSINESS: 199, PRO: 399 };
  const planLimitMap: Record<typeof code, number> = { FREE: 3, BUSINESS: 10, PRO: 30 };
  const existing = await db.businessPlan.findUnique({ where: { code } });
  if (existing) return existing;
  return db.businessPlan.create({
    data: {
      code,
      name: planNameMap[code],
      monthlyPrice: planPriceMap[code],
      productLimit: planLimitMap[code],
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

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  const requestedSlug = normalizePublicSlug(normalize(body.slug));
  const normalizedSlug = requestedSlug || existingBusiness?.slug || generatedPublicSlug();

  const payload = {
    name: normalize(body.name),
    slug: normalizedSlug,
    businessType: normalize(body.businessType),
    description: normalize(body.description),
    city: normalize(body.city),
    whatsapp: normalize(body.whatsapp),
    phone: normalize(body.phone),
    address: normalize(body.address),
    logoUrl: normalize(body.logoUrl),
    primaryColor: normalize(body.primaryColor, "#6f3bd2"),
    entityType: normalize(body.entityType),
    businessCategory: normalize(body.businessCategory),
    onboardingCompleted: true,
    onboardingStep: normalize(body.onboardingStep, "published"),
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة" }, { status: 400 });
  }

  if (!isValidPublicSlug(normalizedSlug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const slugTaken = await db.business.findFirst({
    where: {
      slug: normalizedSlug,
      deletedAt: null,
      ...(existingBusiness ? { id: { not: existingBusiness.id } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) {
    if (!requestedSlug && !existingBusiness) {
      const retrySlug = generatedPublicSlug();
      if (isValidPublicSlug(retrySlug)) {
        const retryTaken = await db.business.findFirst({ where: { slug: retrySlug, deletedAt: null }, select: { id: true } });
        if (!retryTaken) parsed.data.slug = retrySlug;
        else return NextResponse.json({ error: "تعذر إنشاء رابط عام آمن. أعد المحاولة." }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: "اسم الرابط مستخدم مسبقاً" }, { status: 409 });
    }
  }

  const finalSlug = parsed.data.slug;
  const freePlan = await ensureBusinessPlan("FREE");
  const businessData = {
    ...parsed.data,
    slug: finalSlug,
    isVerified: existingBusiness?.isVerified ?? false,
    isPublished: true,
    publishedAt: existingBusiness?.publishedAt ?? new Date(),
    onboardingCompleted: true,
    onboardingStep: "published",
    planId: existingBusiness?.planId ?? freePlan.id,
  };

  const business = existingBusiness
    ? await db.business.update({ where: { id: existingBusiness.id }, data: businessData })
    : await db.business.create({ data: { ownerId: user.id, ...businessData } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);

  return NextResponse.json({ business: { id: business.id, slug: business.slug }, redirectTo: "/dashboard?welcome=1" }, { status: existingBusiness ? 200 : 201 });
}
