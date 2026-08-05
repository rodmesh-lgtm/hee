import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentUserForWrites } from "../../../lib/auth";
import { businessSchema } from "../../../lib/validation";
import { normalizePageModulesForPersistence, serializePageModules } from "../../../lib/page-modules";

type CreateBusinessPayload = {
  name?: string;
  slug?: string;
  businessType?: string;
  entityType?: string;
  businessCategory?: string;
  description?: string;
  city?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  onboardingCompleted?: boolean;
  onboardingStep?: string;
};

function normalize(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function buildSlug(value: string) {
  const arabicMap: Record<string, string> = {
    ا: "a",
    أ: "a",
    إ: "i",
    آ: "a",
    ب: "b",
    ت: "t",
    ث: "th",
    ج: "j",
    ح: "h",
    خ: "kh",
    د: "d",
    ذ: "dh",
    ر: "r",
    ز: "z",
    س: "s",
    ش: "sh",
    ص: "s",
    ض: "d",
    ط: "t",
    ظ: "z",
    ع: "a",
    غ: "gh",
    ف: "f",
    ق: "q",
    ك: "k",
    ل: "l",
    م: "m",
    ن: "n",
    ه: "h",
    و: "w",
    ي: "y",
    ى: "y",
    ء: "",
    ئ: "y",
    ؤ: "w",
    ة: "h",
  };

  const normalized = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => arabicMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (normalized) {
    return normalized;
  }

  return `business-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const entityType = normalize(body.entityType) || normalize(body.businessType) || "نشاط عام";
  const categoryType = normalize(body.businessCategory) || normalize(body.businessType) || "نشاط عام";
  const businessType = categoryType || entityType;
  const payload = {
    name: normalize(body.name),
    slug: normalize(body.slug) || buildSlug(normalize(body.name) || "business"),
    businessType,
    description: normalize(body.description),
    city: normalize(body.city),
    whatsapp: normalize(body.whatsapp),
    phone: normalize(body.phone),
    address: normalize(body.address),
    logoUrl: normalize(body.logoUrl),
    primaryColor: normalize(body.primaryColor, "#6366f1"),
    entityType,
    businessCategory: normalize(body.businessCategory),
    onboardingCompleted: typeof body.onboardingCompleted === "boolean" ? body.onboardingCompleted : true,
    onboardingStep: normalize(body.onboardingStep, "business_details_completed"),
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const slugCandidate = parsed.data.slug;
  const slugTaken = await db.business.findUnique({ where: { slug: slugCandidate } });
  if (slugTaken) {
    const fallbackSlug = buildSlug(`${parsed.data.name}-${Date.now()}`);
    parsed.data.slug = fallbackSlug;
  }

  try {
    const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id } });
    const prismaData = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      businessType: parsed.data.businessType,
      description: parsed.data.description,
      city: parsed.data.city,
      whatsapp: parsed.data.whatsapp,
      phone: parsed.data.phone,
      address: parsed.data.address,
      logoUrl: parsed.data.logoUrl,
      primaryColor: parsed.data.primaryColor,
      entityType: parsed.data.entityType,
      businessCategory: parsed.data.businessCategory,
      pageModules: serializePageModules(normalizePageModulesForPersistence(undefined, parsed.data.businessType)),
      isVerified: false,
      isPublished: existingBusiness?.isPublished ?? false,
      onboardingCompleted: parsed.data.onboardingCompleted,
      onboardingStep: parsed.data.onboardingStep,
    };

    if (existingBusiness) {
      await db.business.update({
        where: { id: existingBusiness.id },
        data: prismaData,
      });
    } else {
      await db.business.create({
        data: {
          ownerId: user.id,
          ...prismaData,
        },
      });
    }
  } catch (error) {
    console.error("Failed to save onboarding business", {
      userId: user.id,
      payload: parsed.data,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    const message = error instanceof Error ? error.message : "تعذر حفظ بيانات النشاط. يرجى المحاولة مرة أخرى.";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production" ? "تعذر حفظ بيانات النشاط. يرجى المحاولة مرة أخرى." : message,
      },
      { status: 500 },
    );
  }

  revalidatePath("/dashboard");

  return NextResponse.json({ redirectTo: "/dashboard" }, { status: 201 });
}
