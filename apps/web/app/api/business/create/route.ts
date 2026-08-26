import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentUserForApiWrite } from "../../../lib/auth";
import { businessSchema } from "../../../lib/validation";
import { isValidPublicSlug, normalizePublicSlug } from "../../../lib/public-url";
import { getPlanEntitlements } from "../../../lib/plan-entitlements";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap = { FREE: "Free", BUSINESS: "Business", PRO: "Pro" } as const;
  const planPriceMap = { FREE: 0, BUSINESS: 199, PRO: 399 } as const;
  const productLimit = getPlanEntitlements(code).productLimit ?? 999999;
  return db.businessPlan.upsert({ where: { code }, update: { productLimit }, create: { code, name: planNameMap[code], monthlyPrice: planPriceMap[code], productLimit, aiEnabled: code !== "FREE", onlinePay: code !== "FREE", isActive: true } });
}

type CreateBusinessPayload = { name?: string; slug?: string; businessType?: string; shortDescription?: string; description?: string; city?: string; whatsapp?: string; phone?: string; address?: string; primaryColor?: string; entityType?: string; businessCategory?: string; onboardingStep?: string };
function normalize(value: unknown, fallback = "") { return typeof value === "string" ? value.trim() : fallback; }
function generatedPublicSlug() { return `business-${randomUUID().slice(0, 8)}`; }
async function slugReservedInTransaction(tx: Prisma.TransactionClient, slug: string) {
  const [business, aliases] = await Promise.all([tx.business.findUnique({ where: { slug }, select: { id: true } }), tx.$queryRaw<Array<{ businessId: string }>>`SELECT "businessId" FROM "BusinessSlugAlias" WHERE "slug" = ${slug} LIMIT 1`]);
  return Boolean(business || aliases[0]);
}

export async function POST(request: Request) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول بحساب صالح" }, { status: 401 });

  // This is an authenticated endpoint, but it still creates durable tenant state and performs
  // plan/slug writes. Bound retries per account and per connection before parsing or touching plans.
  try {
    const address = requestClientAddress(request) || "unknown";
    const [userRate, addressRate] = await Promise.all([
      consumePublicWriteLimit({ scope: "business-create-user", businessId: "onboarding", identity: user.id, limit: 12, windowSeconds: 60 * 60 }),
      consumePublicWriteLimit({ scope: "business-create-ip", businessId: "onboarding", identity: address, limit: 30, windowSeconds: 60 * 60 }),
    ]);
    if (!userRate.allowed || !addressRate.allowed) {
      const retryAfter = Math.max(1, userRate.retryAfterSeconds, addressRate.retryAfterSeconds);
      return NextResponse.json({ error: "تمت محاولات إنشاء كثيرة. حاول مرة أخرى لاحقاً." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
  } catch (error) {
    console.error("[business-create] rate_limit_failed", error);
    return NextResponse.json({ error: "تعذر التحقق من الطلب الآن. حاول مرة أخرى بعد قليل." }, { status: 503, headers: { "Retry-After": "30" } });
  }

  let body: CreateBusinessPayload;
  try { body = (await readBoundedJson(request, 64 * 1024)) as CreateBusinessPayload; }
  catch (error) {
    return NextResponse.json(
      { error: error instanceof RequestBodyTooLargeError ? "حجم بيانات النشاط أكبر من المسموح" : "بيانات غير صالحة" },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }

  const requestedSlug = normalizePublicSlug(normalize(body.slug));
  const initialSlug = requestedSlug || generatedPublicSlug();
  // Branding assets are trusted only when they enter through HEE's validated upload/storage
  // path. Never accept a client-supplied logo URL during tenant creation.
  const payload = { name: normalize(body.name), slug: initialSlug, businessType: normalize(body.businessType), shortDescription: normalize(body.shortDescription), description: normalize(body.description), city: normalize(body.city), whatsapp: normalize(body.whatsapp), phone: normalize(body.phone), address: normalize(body.address), logoUrl: "", primaryColor: "#6f3bd2", entityType: normalize(body.entityType), businessCategory: normalize(body.businessCategory), onboardingCompleted: true, onboardingStep: "profile_created" };
  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة" }, { status: 400 });
  if (!isValidPublicSlug(parsed.data.slug)) return NextResponse.json({ error: "الرابط العام غير متاح" }, { status: 409 });

  const freePlan = await ensureBusinessPlan("FREE");
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`create-business:${user.id}`}))`;
      const existingBusiness = await tx.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, select: { id: true } });
      if (existingBusiness) return { kind: "exists" as const };
      let finalSlug = parsed.data.slug;
      let slugTaken = await slugReservedInTransaction(tx, finalSlug);
      if (slugTaken && requestedSlug) return { kind: "slug-taken" as const };
      if (slugTaken) {
        for (let attempt = 0; attempt < 5 && slugTaken; attempt += 1) { finalSlug = generatedPublicSlug(); if (!isValidPublicSlug(finalSlug)) continue; slugTaken = await slugReservedInTransaction(tx, finalSlug); }
        if (slugTaken || !isValidPublicSlug(finalSlug)) return { kind: "slug-generation-failed" as const };
      }
      const business = await tx.business.create({ data: { ownerId: user.id, ...parsed.data, slug: finalSlug, isVerified: false, isPublished: false, publishedAt: null, onboardingCompleted: true, onboardingStep: "profile_created", planId: freePlan.id }, select: { id: true, slug: true } });
      return { kind: "created" as const, business };
    });
    if (result.kind === "exists") return NextResponse.json({ error: "يوجد نشاط مرتبط بهذا الحساب بالفعل" }, { status: 409 });
    if (result.kind === "slug-taken") return NextResponse.json({ error: "اسم الرابط مستخدم أو محفوظ مسبقاً" }, { status: 409 });
    if (result.kind === "slug-generation-failed") return NextResponse.json({ error: "تعذر إنشاء رابط عام آمن. أعد المحاولة." }, { status: 409 });
    revalidatePath("/dashboard"); revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${result.business.slug}`);
    return NextResponse.json({ business: result.business, redirectTo: "/dashboard?welcome=1" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "اسم الرابط مستخدم أو تم إنشاء النشاط بالفعل. حدّث الصفحة وأعد المحاولة." }, { status: 409 });
    console.error("[business-create] failed", error);
    return NextResponse.json({ error: "تعذر إنشاء النشاط الآن. حاول مرة أخرى بعد قليل." }, { status: 500 });
  }
}
