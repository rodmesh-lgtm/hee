"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getPersistentStorageAdapter } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { businessSchema } from "../lib/validation";
import { normalizePageModulesForPersistence, serializePageModules } from "../lib/page-modules";
import { getPlanEntitlements } from "../lib/plan-entitlements";

export type ActionState = { error?: string; success?: string };

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap = { FREE: "Free", BUSINESS: "Business", PRO: "Pro" } as const;
  const monthlyPriceMap = { FREE: 0, BUSINESS: 199, PRO: 399 } as const;
  const productLimit = getPlanEntitlements(code).productLimit ?? 999999;
  const existing = await db.businessPlan.findUnique({ where: { code } });
  if (existing) {
    if (existing.productLimit !== productLimit) {
      return db.businessPlan.update({ where: { id: existing.id }, data: { productLimit } });
    }
    return existing;
  }
  return db.businessPlan.create({ data: { code, name: planNameMap[code], monthlyPrice: monthlyPriceMap[code], productLimit, aiEnabled: code !== "FREE", onlinePay: code !== "FREE", isActive: true } });
}

function getFormString(formData: FormData, key: string, fallback = "") {
  return formData.getAll(key).map((value) => typeof value === "string" ? value.trim() : "").find(Boolean) ?? fallback;
}

async function uploadBusinessImage(file: File, folder: string) {
  if (file.size === 0) return "";
  return (await getPersistentStorageAdapter().upload({ file, folder })).url;
}

async function cleanupUploadedBusinessImages(logoUrl?: string, coverUrl?: string) {
  try { await Promise.all([removePersistentUrl(logoUrl, "logos"), removePersistentUrl(coverUrl, "covers")]); }
  catch (error) { console.error("Failed to clean uncommitted business images", error); }
}

async function cleanupReplacedBusinessImages(
  previous: { logoUrl?: string | null; coverUrl?: string | null } | null | undefined,
  next: { logoUrl?: string | null; coverUrl?: string | null },
) {
  try {
    await Promise.all([
      removeReplacedPersistentUrl(previous?.logoUrl, next.logoUrl, "logos"),
      removeReplacedPersistentUrl(previous?.coverUrl, next.coverUrl, "covers"),
    ]);
  } catch (error) {
    console.error("Failed to clean replaced business images", error);
  }
}

export async function createBusinessFromOnboarding(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "وضع المعاينة QA للقراءة فقط" };

  const entityType = getFormString(formData, "entityType") || getFormString(formData, "businessType");
  const payload = {
    name: getFormString(formData, "name"),
    slug: getFormString(formData, "slug"),
    businessType: entityType || getFormString(formData, "businessType"),
    description: getFormString(formData, "description"),
    shortDescription: getFormString(formData, "shortDescription"),
    city: getFormString(formData, "city"),
    whatsapp: getFormString(formData, "whatsapp"),
    phone: getFormString(formData, "phone"),
    address: getFormString(formData, "address"),
    logoUrl: getFormString(formData, "logoUrl"),
    primaryColor: getFormString(formData, "primaryColor", "#6366f1"),
    entityType,
    businessCategory: getFormString(formData, "businessCategory"),
    onboardingCompleted: true,
  };
  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة" };

  const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  const slugTaken = await db.business.findFirst({ where: { slug: parsed.data.slug, id: existingBusiness ? { not: existingBusiness.id } : undefined } });
  if (slugTaken) return { error: "اسم الرابط مستخدم أو محجوز مسبقاً" };

  const freePlan = await ensureBusinessPlan("FREE");
  const pageModules = serializePageModules(normalizePageModulesForPersistence(undefined, parsed.data.businessType));
  const { slug, ...businessFields } = parsed.data;
  if (existingBusiness) {
    await db.business.update({
      where: { id: existingBusiness.id },
      data: { ...businessFields, slug, pageModules, isVerified: false, isPublished: existingBusiness.isPublished },
    });
  } else {
    await db.business.create({
      data: { ownerId: user.id, ...businessFields, slug, pageModules, planId: freePlan.id, isVerified: false, isPublished: false },
    });
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateBusinessBrandingImagesAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "وضع المعاينة QA للقراءة فقط" };
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  if (!business) return { error: "لا يوجد نشاط مرتبط بهذا الحساب" };

  const logoFile = formData.get("logoFile");
  const coverFile = formData.get("coverFile");
  const nextData: { logoUrl?: string; coverUrl?: string } = {};
  try {
    if (logoFile instanceof File && logoFile.size > 0) nextData.logoUrl = await uploadBusinessImage(logoFile, "logos");
    if (coverFile instanceof File && coverFile.size > 0) nextData.coverUrl = await uploadBusinessImage(coverFile, "covers");
  } catch (error) {
    await cleanupUploadedBusinessImages(nextData.logoUrl, nextData.coverUrl);
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }
  if (!nextData.logoUrl && !nextData.coverUrl) return { error: "اختر شعاراً أو صورة غلاف قبل الحفظ" };

  try { await db.business.update({ where: { id: business.id }, data: nextData }); }
  catch {
    await cleanupUploadedBusinessImages(nextData.logoUrl, nextData.coverUrl);
    return { error: "تعذر حفظ صور الهوية. يرجى المحاولة مرة أخرى." };
  }

  await cleanupReplacedBusinessImages(business, {
    logoUrl: nextData.logoUrl ?? business.logoUrl,
    coverUrl: nextData.coverUrl ?? business.coverUrl,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/branding");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الهوية والصور بنجاح" };
}

export async function getBusinessPublic(slug: string) {
  const now = new Date();
  try {
    return await db.business.findFirst({
      where: { slug, deletedAt: null },
      include: {
        products: { where: { isActive: true, deletedAt: null }, include: { category: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        offers: { where: { isActive: true, deletedAt: null, OR: [{ AND: [{ startsAt: null }, { endsAt: null }] }, { AND: [{ startsAt: { lte: now } }, { endsAt: null }] }, { AND: [{ startsAt: null }, { endsAt: { gte: now } }] }, { AND: [{ startsAt: { lte: now } }, { endsAt: { gte: now } }] }] }, orderBy: [{ createdAt: "desc" }] },
        socialLinks: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        services: { where: { isActive: true, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        openingHours: { orderBy: { dayOfWeek: "asc" } },
        galleryItems: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        branches: { where: { isActive: true }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        contactPersons: { where: { isActive: true }, include: { branch: true, department: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        departments: { where: { isActive: true }, include: { contacts: { where: { isActive: true }, include: { branch: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  } catch {
    return null;
  }
}
