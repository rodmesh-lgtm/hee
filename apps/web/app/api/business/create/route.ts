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

export async function POST(request: Request) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول بحساب صالح" }, { status: 401 });

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const payload = {
    name: normalize(body.name),
    slug: normalize(body.slug),
    businessType: normalize(body.businessType),
    description: normalize(body.description),
    city: normalize(body.city),
    whatsapp: normalize(body.whatsapp),
    phone: normalize(body.phone),
    address: normalize(body.address),
    logoUrl: normalize(body.logoUrl),
    primaryColor: normalize(body.primaryColor, "#6366f1"),
    entityType: normalize(body.entityType),
    businessCategory: normalize(body.businessCategory),
    onboardingCompleted: true,
    onboardingStep: normalize(body.onboardingStep, "published"),
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة" }, { status: 400 });
  }

  const normalizedSlug = normalizePublicSlug(parsed.data.slug);
  if (!isValidPublicSlug(normalizedSlug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  const slugTaken = await db.business.findFirst({
    where: {
      slug: normalizedSlug,
      deletedAt: null,
      ...(existingBusiness ? { id: { not: existingBusiness.id } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) return NextResponse.json({ error: "اسم الرابط مستخدم مسبقاً" }, { status: 409 });

  const freePlan = await ensureBusinessPlan("FREE");
  const businessData = {
    ...parsed.data,
    slug: normalizedSlug,
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
  revalidatePath(`/${business.slug}`);

  return NextResponse.json({ business: { id: business.id, slug: business.slug }, redirectTo: `/${business.slug}` }, { status: existingBusiness ? 200 : 201 });
}
