"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForWrites } from "../lib/auth";
import { getStorageAdapter } from "../lib/storage";
import { businessProfileSchema, businessSchema } from "../lib/validation";
import { getDefaultPageModules, normalizePageModulesForPersistence, serializePageModules } from "../lib/page-modules";

export type ActionState = {
  error?: string;
  success?: string;
};

function getFormString(formData: FormData, key: string, fallback = "") {
  const values = formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return values[0] ?? fallback;
}

function getFormBool(formData: FormData, key: string) {
  return String(formData.get(key) ?? "off") === "on";
}

async function uploadBusinessImage(file: File, folder: string) {
  if (file.size === 0) {
    return "";
  }

  const storage = getStorageAdapter();
  const uploaded = await storage.upload({ file, folder });
  return uploaded.url;
}

export async function createBusinessFromOnboarding(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

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
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة";
    return { error: message };
  }

  const slugTaken = await db.business.findUnique({ where: { slug: parsed.data.slug } });
  if (slugTaken) {
    return { error: "اسم الرابط مستخدم مسبقاً" };
  }

  const existingBusiness = await db.business.findFirst({ where: { ownerId: user.id } });

  const pageModules = serializePageModules(normalizePageModulesForPersistence(undefined, parsed.data.businessType));

  if (existingBusiness) {
    await db.business.update({
      where: { id: existingBusiness.id },
      data: {
        ...parsed.data,
        pageModules,
        isVerified: false,
        isPublished: existingBusiness.isPublished,
      },
    });
  } else {
    await db.business.create({
      data: {
        ownerId: user.id,
        ...parsed.data,
        pageModules,
        isVerified: false,
        isPublished: false,
      },
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateBusinessAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    city: String(formData.get("city") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? "#6366f1"),
    isPublished: String(formData.get("isPublished") ?? "false") === "on",
  };

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    return { error: "لا يوجد نشاط لهذا المستخدم" };
  }

  await db.business.update({
    where: { id: business.id },
    data: payload,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  redirect("/dashboard");
}

export async function saveBusinessProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  let existingBusiness = null;

  try {
    existingBusiness = await db.business.findFirst({ where: { ownerId: user.id } });
  } catch {
    return { error: "تعذر قراءة بيانات النشاط الحالية. تأكد من تشغيل ترحيل قاعدة البيانات ثم أعد المحاولة." };
  }

  let uploadedLogo = "";
  let uploadedCover = "";

  try {
    const logoFile = formData.get("logoFile");
    const coverFile = formData.get("coverFile");

    if (logoFile instanceof File && logoFile.size > 0) {
      uploadedLogo = await uploadBusinessImage(logoFile, "logos");
    }

    if (coverFile instanceof File && coverFile.size > 0) {
      uploadedCover = await uploadBusinessImage(coverFile, "covers");
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع الصورة" };
  }

  const payload = {
    name: getFormString(formData, "name"),
    nameEn: getFormString(formData, "nameEn"),
    businessType: getFormString(formData, "businessType"),
    description: getFormString(formData, "description"),
    logoUrl: uploadedLogo || getFormString(formData, "logoUrl"),
    coverUrl: uploadedCover || getFormString(formData, "coverUrl"),
    phone: getFormString(formData, "phone"),
    whatsapp: getFormString(formData, "whatsapp"),
    email: getFormString(formData, "email"),
    website: getFormString(formData, "website"),
    country: getFormString(formData, "country"),
    city: getFormString(formData, "city"),
    district: getFormString(formData, "district"),
    address: getFormString(formData, "address"),
    googleMapsLink: getFormString(formData, "googleMapsLink"),
    xUrl: getFormString(formData, "xUrl"),
    instagramUrl: getFormString(formData, "instagramUrl"),
    snapchatUrl: getFormString(formData, "snapchatUrl"),
    tiktokUrl: getFormString(formData, "tiktokUrl"),
    facebookUrl: getFormString(formData, "facebookUrl"),
    workingHours: getFormString(formData, "workingHours"),
    deliveryAvailable: getFormBool(formData, "deliveryAvailable"),
    bookingAvailable: getFormBool(formData, "bookingAvailable"),
    acceptOnlineOrders: getFormBool(formData, "acceptOnlineOrders"),
    primaryColor: getFormString(formData, "primaryColor", "#5D43EF"),
    secondaryColor: getFormString(formData, "secondaryColor", "#1E293B"),
    buttonColor: getFormString(formData, "buttonColor", "#4F46E5"),
    buttonStyle: getFormString(formData, "buttonStyle", "rounded"),
    cardStyle: getFormString(formData, "cardStyle", "glass"),
    slug: getFormString(formData, "slug"),
    metaTitle: getFormString(formData, "metaTitle"),
    metaDescription: getFormString(formData, "metaDescription"),
    isPublished: getFormBool(formData, "isPublished"),
  };

  const parsed = businessProfileSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة";
    return { error: message };
  }

  let slugTaken = null;

  try {
    slugTaken = await db.business.findFirst({
      where: {
        slug: parsed.data.slug,
        id: existingBusiness ? { not: existingBusiness.id } : undefined,
      },
    });
  } catch {
    return { error: "تعذر التحقق من الرابط العام. يرجى المحاولة مرة أخرى." };
  }

  if (slugTaken) {
    return { error: "الرابط العام مستخدم من نشاط آخر" };
  }

  try {
    if (existingBusiness) {
      await db.business.update({
        where: { id: existingBusiness.id },
        data: parsed.data,
      });
    } else {
      await db.business.create({
        data: {
          ownerId: user.id,
          ...parsed.data,
          pageModules: serializePageModules(normalizePageModulesForPersistence(undefined, parsed.data.businessType)),
          isVerified: false,
        },
      });
    }
  } catch {
    return { error: "تعذر حفظ ملف النشاط. تأكد من تحديث قاعدة البيانات ثم أعد المحاولة." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  revalidatePath(`/b/${parsed.data.slug}`);

  return { success: "تم حفظ ملف النشاط بنجاح" };
}

export async function updateBusinessBrandingImagesAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    return { error: "لا يوجد نشاط مرتبط بهذا الحساب" };
  }

  const logoFile = formData.get("logoFile");
  const coverFile = formData.get("coverFile");

  const nextData: { logoUrl?: string; coverUrl?: string } = {};

  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      nextData.logoUrl = await uploadBusinessImage(logoFile, "logos");
    }

    if (coverFile instanceof File && coverFile.size > 0) {
      nextData.coverUrl = await uploadBusinessImage(coverFile, "covers");
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }

  if (!nextData.logoUrl && !nextData.coverUrl) {
    return { error: "اختر شعاراً أو صورة غلاف قبل الحفظ" };
  }

  await db.business.update({
    where: { id: business.id },
    data: nextData,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/branding");
  revalidatePath(`/b/${business.slug}`);

  return { success: "تم تحديث الهوية والصور بنجاح" };
}

export async function getBusinessByOwner(userId: string) {
  return db.business.findFirst({
    where: { ownerId: userId },
    include: {
      products: true,
    },
  });
}

export async function getBusinessPublic(slug: string) {
  const now = new Date();

  try {
    return await db.business.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          include: { category: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        },
        offers: {
          where: {
            isActive: true,
            OR: [
              {
                AND: [{ startsAt: null }, { endsAt: null }],
              },
              {
                AND: [{ startsAt: { lte: now } }, { endsAt: null }],
              },
              {
                AND: [{ startsAt: null }, { endsAt: { gte: now } }],
              },
              {
                AND: [{ startsAt: { lte: now } }, { endsAt: { gte: now } }],
              },
            ],
          },
          orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        openingHours: { orderBy: { dayOfWeek: "asc" } },
        galleryItems: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        socialLinks: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });
  } catch (error) {
    const err = error as { name?: string; message?: string; code?: string; clientVersion?: string };
    console.error("[public-business:getBusinessPublic] query_failed", {
      slug,
      provider: "sqlite",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      nodeEnv: process.env.NODE_ENV,
      errorName: err?.name,
      errorCode: err?.code,
      prismaClientVersion: err?.clientVersion,
      errorMessage: err?.message,
    });
    throw error;
  }
}

export async function isSlugAvailable(slug: string) {
  const business = await db.business.findUnique({ where: { slug } });
  return !business;
}
