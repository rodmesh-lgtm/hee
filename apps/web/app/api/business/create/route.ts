import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
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
  return db.businessPlan.upsert({
    where: { code },
    update: { productLimit },
    create: {
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

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const requestedSlug = normalizePublicSlug(normalize(body.slug));
  const initialSlug = requestedSlug || generatedPublicSlug();
  const payload = {
    name: normalize(body.name),
    slug: initialSlug,
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
  if (!isValidPublicSlug(parsed.data.slug)) {
    return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });
  }

  const freePlan = await ensureBusinessPlan("FREE");

  try {
    const result = await db.$transaction(async (tx) => {
      // The application currently supports one active business per owner. Serialize
      // concurrent onboarding submissions for the same user without preventing
      // historical soft-deleted rows or future multi-business migrations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

      const existingBusiness = await tx.business.findFirst({
        where: { ownerId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (existingBusiness) return { kind: "exists" as const };

      let finalSlug = parsed.data.slug;
      let slugTaken = await tx.business.findUnique({ where: { slug: finalSlug }, select: { id: true } });
      if (slugTaken && requestedSlug) return { kind: "slug-taken" as const };

      if (slugTaken) {
        // Generated slugs are retried inside the same owner-serialized transaction.
        // The database unique constraint remains the final guard against another
        // owner's simultaneous claim of the same generated value.
        for (let attempt = 0; attempt < 3 && slugTaken; attempt += 1) {
          finalSlug = generatedPublicSlug();
          if (!isValidPublicSlug(finalSlug)) continue;
          slugTaken = await tx.business.findUnique({ where: { slug: finalSlug }, select: { id: true } });
        }
        if (slugTaken || !isValidPublicSlug(finalSlug)) return { kind: "slug-generation-failed" as const };
      }

      const business = await tx.business.create({
        data: {
          ownerId: user.id,
          ...parsed.data,
          slug: finalSlug,
          isVerified: false,
          isPublished: false,
          publishedAt: null,
          onboardingCompleted: true,
          onboardingStep: "profile_created",
          planId: freePlan.id,
        },
        select: { id: true, slug: true },
      });
      return { kind: "created" as const, business };
    });

    if (result.kind === "exists") {
      return NextResponse.json({ error: "يوجد نشاط مرتبط بهذا الحساب بالفعل" }, { status: 409 });
    }
    if (result.kind === "slug-taken") {
      return NextResponse.json({ error: "اسم الرابط مستخدم أو محجوز مسبقاً" }, { status: 409 });
    }
    if (result.kind === "slug-generation-failed") {
      return NextResponse.json({ error: "تعذر إنشاء رابط عام آمن. أعد المحاولة." }, { status: 409 });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-page");
    revalidatePath("/preview");
    revalidatePath(`/${result.business.slug}`);
    return NextResponse.json(
      { business: result.business, redirectTo: "/dashboard?welcome=1" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "اسم الرابط مستخدم أو تم إنشاء النشاط بالفعل. حدّث الصفحة وأعد المحاولة." }, { status: 409 });
    }
    throw error;
  }
}
