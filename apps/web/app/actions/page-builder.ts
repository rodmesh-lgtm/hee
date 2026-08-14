"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForWrites } from "../lib/auth";
import {
  contactSchema,
  identitySchema,
  locationSchema,
  offerSchema,
  productSchema,
  serviceSchema,
  slugSchema,
  workingHoursSchema,
} from "../lib/page-builder-validation";
import { getStorageAdapter } from "../lib/storage";
import { normalizePageModulesInput, serializePageModules } from "../lib/page-modules";

export type BuilderActionState = {
  error?: string;
  success?: string;
};

function resolveFormData(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData) {
  if (prevOrFormData instanceof FormData) {
    return prevOrFormData;
  }

  if (maybeFormData instanceof FormData) {
    return maybeFormData;
  }

  throw new Error("تعذر قراءة بيانات النموذج");
}

function formValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function formBool(formData: FormData, key: string) {
  return String(formData.get(key) ?? "off") === "on";
}

function normalizeSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function readCustomLink(formData: FormData) {
  const title = formValue(formData, "customLinkTitle");
  const url = normalizeUrl(formValue(formData, "customLinkUrl"));

  if (!title || !url) {
    return null;
  }

  return { title, url };
}

function resolveThemePreset(
  preset: string,
  current: { secondaryColor: string | null; buttonColor: string | null; buttonStyle: string | null; cardStyle: string | null },
) {
  switch (preset) {
    case "fresh":
      return {
        secondaryColor: "#052E16",
        buttonColor: "#22C55E",
        buttonStyle: "rounded",
        cardStyle: "flat",
      };
    case "sunset":
      return {
        secondaryColor: "#2A0A0A",
        buttonColor: "#F97316",
        buttonStyle: "pill",
        cardStyle: "elevated",
      };
    case "ocean":
      return {
        secondaryColor: "#082F49",
        buttonColor: "#0EA5E9",
        buttonStyle: "rounded",
        cardStyle: "glass",
      };
    default:
      return current;
  }
}

async function requireOwnedBusiness() {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { user: null, business: null, blocked: true };
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  return { user, business, blocked: false };
}

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap: Record<typeof code, string> = {
    FREE: "Free",
    BUSINESS: "Business",
    PRO: "Pro",
  };

  const monthlyPriceMap: Record<typeof code, number> = {
    FREE: 0,
    BUSINESS: 199,
    PRO: 399,
  };

  const productLimitMap: Record<typeof code, number> = {
    FREE: 3,
    BUSINESS: 10,
    PRO: 30,
  };

  const existing = await db.businessPlan.findUnique({ where: { code } });
  if (existing) {
    return existing;
  }

  return db.businessPlan.create({
    data: {
      code,
      name: planNameMap[code],
      monthlyPrice: monthlyPriceMap[code],
      productLimit: productLimitMap[code],
      aiEnabled: code !== "FREE",
      onlinePay: code !== "FREE",
      isActive: true,
    },
  });
}

async function ensureBusinessForOwner(input: {
  name: string;
  businessType: string;
  shortDescription: string;
  description: string;
}) {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return null;
  }

  const existing = await db.business.findFirst({ where: { ownerId: user.id } });
  if (existing) {
    return existing;
  }

  const baseSlug = normalizeSlug(input.name) || `business-${crypto.randomUUID().slice(0, 8)}`;
  let slugCandidate = baseSlug;
  let suffix = 1;

  while (await db.business.findUnique({ where: { slug: slugCandidate } })) {
    suffix += 1;
    slugCandidate = `${baseSlug}-${suffix}`;
  }

  const freePlan = await ensureBusinessPlan("FREE");

  return db.business.create({
    data: {
      ownerId: user.id,
      slug: slugCandidate,
      name: input.name,
      nameEn: null,
      businessType: input.businessType,
      shortDescription: input.shortDescription,
      description: input.description,
      country: "السعودية",
      planId: freePlan.id,
      isPublished: false,
      acceptOnlineOrders: false,
      bookingAvailable: false,
      deliveryAvailable: false,
    },
  });
}

async function uploadOptionalImage(formData: FormData, fieldName: string, folder: string) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  const storage = getStorageAdapter();
  const uploaded = await storage.upload({ file, folder });
  return uploaded.url;
}

async function upsertSocialLinks(businessId: string, links: Record<string, string | null>) {
  const entries = Object.entries(links);

  for (const [platform, url] of entries) {
    const existing = await db.socialLink.findFirst({
      where: { businessId, platform },
    });

    if (!url) {
      if (existing) {
        await db.socialLink.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
      }
      continue;
    }

    if (existing) {
      await db.socialLink.update({
        where: { id: existing.id },
        data: { url, isActive: true },
      });
    } else {
      await db.socialLink.create({
        data: {
          businessId,
          platform,
          url,
          isActive: true,
        },
      });
    }
  }
}

export async function checkSlugAvailabilityAction(slug: string, currentBusinessId?: string) {
  const normalized = normalizeSlug(slug);
  const parsed = slugSchema.safeParse(normalized);
  if (!parsed.success) {
    return { available: false, normalized, message: parsed.error.issues[0]?.message ?? "رابط غير صالح" };
  }

  const found = await db.business.findUnique({ where: { slug: parsed.data } });
  if (!found || found.id === currentBusinessId) {
    return { available: true, normalized: parsed.data, message: "متاح" };
  }

  return { available: false, normalized: parsed.data, message: "غير متاح" };
}

export async function saveIdentityStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const payload = {
    name: formValue(formData, "name"),
    nameEn: formValue(formData, "nameEn"),
    businessType: formValue(formData, "businessType"),
    shortDescription: formValue(formData, "shortDescription"),
    description: formValue(formData, "description"),
  };

  const parsed = identitySchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" };
  }

  const business = await ensureBusinessForOwner(parsed.data);
  if (!business) {
    return { error: "لا يوجد نشاط مرتبط بهذا الحساب" };
  }

  let logoUrl: string | null = null;
  let coverUrl: string | null = null;

  try {
    logoUrl = await uploadOptionalImage(formData, "logoFile", "logos");
    coverUrl = await uploadOptionalImage(formData, "coverFile", "covers");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }

  await db.business.update({
    where: { id: business.id },
    data: {
      name: parsed.data.name,
      nameEn: parsed.data.nameEn || null,
      businessType: parsed.data.businessType,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      ...(logoUrl ? { logoUrl } : {}),
      ...(coverUrl ? { coverUrl } : {}),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حفظ الهوية بنجاح" };
}

export async function saveSlugStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business, blocked } = await requireOwnedBusiness();
  if (blocked || !business) {
    return { error: blocked ? "وضع المعاينة QA للقراءة فقط" : "ابدأ بحفظ بيانات النشاط أولاً" };
  }

  const slug = normalizeSlug(formValue(formData, "slug"));
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "الرابط غير صالح" };
  }

  const found = await db.business.findUnique({ where: { slug: parsed.data } });
  if (found && found.id !== business.id) {
    return { error: "هذا الرابط مستخدم مسبقاً" };
  }

  await db.business.update({
    where: { id: business.id },
    data: { slug: parsed.data },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${parsed.data}`);
  return { success: "تم حفظ الرابط العام" };
}

export async function saveContactStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const parsed = contactSchema.safeParse({
    whatsapp: formValue(formData, "whatsapp"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    website: formValue(formData, "website"),
    instagramUrl: formValue(formData, "instagramUrl"),
    tiktokUrl: formValue(formData, "tiktokUrl"),
    snapchatUrl: formValue(formData, "snapchatUrl"),
    xUrl: formValue(formData, "xUrl"),
    facebookUrl: formValue(formData, "facebookUrl"),
  });

  if (!parsed.success) {
    return { error: "بيانات التواصل غير صالحة" };
  }

  const website = normalizeUrl(parsed.data.website ?? "");
  const instagramUrl = normalizeUrl(parsed.data.instagramUrl ?? "");
  const tiktokUrl = normalizeUrl(parsed.data.tiktokUrl ?? "");
  const snapchatUrl = normalizeUrl(parsed.data.snapchatUrl ?? "");
  const xUrl = normalizeUrl(parsed.data.xUrl ?? "");
  const facebookUrl = normalizeUrl(parsed.data.facebookUrl ?? "");

  await db.business.update({
    where: { id: business.id },
    data: {
      whatsapp: parsed.data.whatsapp || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      website,
      instagramUrl,
      tiktokUrl,
      snapchatUrl,
      xUrl,
      facebookUrl,
    },
  });

  await upsertSocialLinks(business.id, {
    Instagram: instagramUrl,
    TikTok: tiktokUrl,
    Snapchat: snapchatUrl,
    X: xUrl,
    Facebook: facebookUrl,
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حفظ بيانات التواصل" };
}

export async function saveLocationStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const parsed = locationSchema.safeParse({
    country: formValue(formData, "country", "السعودية"),
    city: formValue(formData, "city"),
    district: formValue(formData, "district"),
    address: formValue(formData, "address"),
    googleMapsLink: formValue(formData, "googleMapsLink"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات الموقع غير صالحة" };
  }

  await db.business.update({
    where: { id: business.id },
    data: {
      country: parsed.data.country,
      city: parsed.data.city,
      district: parsed.data.district,
      address: parsed.data.address,
      googleMapsLink: normalizeUrl(parsed.data.googleMapsLink ?? ""),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حفظ بيانات الموقع" };
}

export async function saveMyPageAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const rawName = formValue(formData, "name") || business.name;
  const rawBusinessType = formValue(formData, "businessType") || business.businessType;
  const rawShortDescription = formValue(formData, "shortDescription") || business.shortDescription || business.description || "";
  const rawDescription = formValue(formData, "description") || business.description || rawShortDescription;
  const normalizedDescription = rawDescription.length >= 10 ? rawDescription : `${rawDescription} ${rawShortDescription}`.trim();

  if (rawName.trim().length < 2) {
    return { error: "اسم النشاط مطلوب" };
  }

  if (rawBusinessType.trim().length < 2) {
    return { error: "نوع النشاط مطلوب" };
  }

  const identityData = {
    name: rawName,
    nameEn: formValue(formData, "nameEn"),
    businessType: rawBusinessType,
    shortDescription: rawShortDescription || business.shortDescription || "صفحة أعمالك الذكية",
    description: normalizedDescription || business.description || rawShortDescription || "صفحة نشاط",
  };

  const contactParsed = contactSchema.safeParse({
    whatsapp: formValue(formData, "whatsapp"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    website: formValue(formData, "website"),
    instagramUrl: formValue(formData, "instagramUrl"),
    tiktokUrl: formValue(formData, "tiktokUrl"),
    snapchatUrl: formValue(formData, "snapchatUrl"),
    xUrl: formValue(formData, "xUrl"),
    facebookUrl: formValue(formData, "facebookUrl"),
  });

  if (!contactParsed.success) {
    return { error: "بيانات التواصل غير صالحة" };
  }

  const locationData = {
    country: formValue(formData, "country", business.country || "السعودية"),
    city: formValue(formData, "city", business.city || ""),
    district: formValue(formData, "district", business.district || ""),
    address: formValue(formData, "address", business.address || ""),
    googleMapsLink: formValue(formData, "googleMapsLink", business.googleMapsLink || ""),
  };

  let logoUrl = business.logoUrl;
  let coverUrl = business.coverUrl;

  try {
    const uploadedLogo = await uploadOptionalImage(formData, "logoFile", "logos");
    const uploadedCover = await uploadOptionalImage(formData, "coverFile", "covers");

    if (uploadedLogo) {
      logoUrl = uploadedLogo;
    }

    if (uploadedCover) {
      coverUrl = uploadedCover;
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }

  const themePreset = formValue(formData, "themePreset", "custom");
  const theme = resolveThemePreset(themePreset, {
    secondaryColor: business.secondaryColor,
    buttonColor: business.buttonColor,
    buttonStyle: business.buttonStyle,
    cardStyle: business.cardStyle,
  });

  const primaryColor = formValue(formData, "primaryColor", business.primaryColor || "#5D43EF");
  const pageModulesJson = formValue(formData, "pageModulesJson", "[]");
  const pageModules = normalizePageModulesInput(pageModulesJson, identityData.businessType);
  const bookingAvailable = pageModules.some((module) => module.enabled && ["request", "services", "inquiry"].includes(module.id));
  const acceptOnlineOrders = pageModules.some((module) => module.enabled && module.id === "products");
  const customLink = readCustomLink(formData);
  const instagramUrl = normalizeUrl(contactParsed.data.instagramUrl ?? "");
  const tiktokUrl = normalizeUrl(contactParsed.data.tiktokUrl ?? "");
  const snapchatUrl = normalizeUrl(contactParsed.data.snapchatUrl ?? "");
  const xUrl = normalizeUrl(contactParsed.data.xUrl ?? "");
  const facebookUrl = normalizeUrl(contactParsed.data.facebookUrl ?? "");

  try {
    await db.$transaction(async (transaction) => {
      await transaction.business.update({
        where: { id: business.id },
        data: {
          name: identityData.name,
          nameEn: identityData.nameEn || null,
          businessType: identityData.businessType,
          shortDescription: identityData.shortDescription,
          description: identityData.description,
          logoUrl,
          coverUrl,
          whatsapp: contactParsed.data.whatsapp || null,
          phone: contactParsed.data.phone || null,
          website: normalizeUrl(contactParsed.data.website ?? ""),
          email: contactParsed.data.email || null,
          country: locationData.country,
          city: locationData.city,
          district: locationData.district,
          address: locationData.address,
          googleMapsLink: normalizeUrl(locationData.googleMapsLink ?? ""),
          bookingAvailable,
          acceptOnlineOrders,
          pageModules: serializePageModules(pageModules),
          primaryColor,
          secondaryColor: theme.secondaryColor,
          buttonColor: theme.buttonColor,
          buttonStyle: theme.buttonStyle,
          cardStyle: theme.cardStyle,
          instagramUrl,
          tiktokUrl,
          snapchatUrl,
          xUrl,
          facebookUrl,
        },
      });

      const syncKnownSocialLink = async (platform: string, url: string | null) => {
        if (!url) {
          await transaction.socialLink.deleteMany({
            where: {
              businessId: business.id,
              platform,
            },
          });
          return;
        }

        await transaction.socialLink.upsert({
          where: {
            businessId_platform: {
              businessId: business.id,
              platform,
            },
          },
          update: { url, isActive: true },
          create: {
            businessId: business.id,
            platform,
            url,
            isActive: true,
          },
        });
      };

      await syncKnownSocialLink("Instagram", instagramUrl);
      await syncKnownSocialLink("TikTok", tiktokUrl);
      await syncKnownSocialLink("Snapchat", snapchatUrl);
      await syncKnownSocialLink("X", xUrl);
      await syncKnownSocialLink("Facebook", facebookUrl);

      if (customLink) {
        const existingCustomLink = await transaction.socialLink.findFirst({
          where: {
            businessId: business.id,
            platform: { notIn: ["Instagram", "TikTok", "Snapchat", "X", "Facebook"] },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

        if (existingCustomLink) {
          await transaction.socialLink.update({
            where: { id: existingCustomLink.id },
            data: {
              platform: customLink.title,
              url: customLink.url,
              isActive: true,
            },
          });
        } else {
          const maxSort = await transaction.socialLink.aggregate({
            where: { businessId: business.id },
            _max: { sortOrder: true },
          });

          await transaction.socialLink.create({
            data: {
              businessId: business.id,
              platform: customLink.title,
              url: customLink.url,
              sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
              isActive: true,
            },
          });
        }
      }
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر حفظ بيانات صفحتي" };
  }

  revalidatePath("/dashboard/my-page");
  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);

  return { success: "تم حفظ التغييرات بنجاح" };
}

export async function saveWorkingHoursStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const raw = formValue(formData, "hoursJson", "[]");
  let parsedJson: unknown = [];

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "تعذر قراءة بيانات ساعات العمل" };
  }

  const parsed = workingHoursSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ساعات العمل غير صالحة" };
  }

  for (const day of parsed.data) {
    await db.workingHours.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: business.id,
          dayOfWeek: day.dayOfWeek,
        },
      },
      update: {
        isClosed: day.isClosed,
        opensAt: day.opensAt,
        closesAt: day.closesAt,
        secondOpensAt: day.secondOpensAt,
        secondClosesAt: day.secondClosesAt,
      },
      create: {
        businessId: business.id,
        dayOfWeek: day.dayOfWeek,
        isClosed: day.isClosed,
        opensAt: day.opensAt,
        closesAt: day.closesAt,
        secondOpensAt: day.secondOpensAt,
        secondClosesAt: day.secondClosesAt,
      },
    });
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حفظ ساعات العمل" };
}

export async function addProductBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const payload = {
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    categoryName: formValue(formData, "categoryName"),
    unit: formValue(formData, "unit"),
    price: Number(formValue(formData, "price", "0")),
    oldPrice: formValue(formData, "oldPrice") ? Number(formValue(formData, "oldPrice")) : null,
    isActive: formBool(formData, "isActive"),
    featured: formBool(formData, "featured"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };
  }

  let categoryId: string | null = null;
  if (parsed.data.categoryName) {
    const category = await db.category.upsert({
      where: { businessId_name: { businessId: business.id, name: parsed.data.categoryName } },
      update: { isActive: true },
      create: { businessId: business.id, name: parsed.data.categoryName },
    });
    categoryId = category.id;
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "products");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة المنتج" };
  }

  await db.product.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      description: parsed.data.description,
      categoryId,
      unit: parsed.data.unit || null,
      price: parsed.data.price,
      oldPrice: parsed.data.oldPrice,
      imageUrl,
      isActive: parsed.data.isActive,
      featured: parsed.data.featured,
      sortOrder: parsed.data.sortOrder,
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تمت إضافة المنتج" };
}

export async function updateProductBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const productId = formValue(formData, "productId");
  const product = await db.product.findFirst({ where: { id: productId, businessId: business.id } });
  if (!product) {
    return { error: "المنتج غير موجود" };
  }

  const payload = {
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    categoryName: formValue(formData, "categoryName"),
    unit: formValue(formData, "unit"),
    price: Number(formValue(formData, "price", "0")),
    oldPrice: formValue(formData, "oldPrice") ? Number(formValue(formData, "oldPrice")) : null,
    isActive: formBool(formData, "isActive"),
    featured: formBool(formData, "featured"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };
  }

  let categoryId: string | null = null;
  if (parsed.data.categoryName) {
    const category = await db.category.upsert({
      where: { businessId_name: { businessId: business.id, name: parsed.data.categoryName } },
      update: { isActive: true },
      create: { businessId: business.id, name: parsed.data.categoryName },
    });
    categoryId = category.id;
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "products");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة المنتج" };
  }

  await db.product.update({
    where: { id: product.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      categoryId,
      unit: parsed.data.unit || null,
      price: parsed.data.price,
      oldPrice: parsed.data.oldPrice,
      isActive: parsed.data.isActive,
      featured: parsed.data.featured,
      sortOrder: parsed.data.sortOrder,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث المنتج" };
}

export async function deleteProductBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const productId = formValue(formData, "productId");
  const product = await db.product.findFirst({ where: { id: productId, businessId: business.id } });
  if (!product) {
    return { error: "المنتج غير موجود" };
  }

  await db.product.delete({ where: { id: product.id } });
  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حذف المنتج" };
}

export async function reorderProductsBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const ids = formValue(formData, "orderedIds")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  for (let i = 0; i < ids.length; i += 1) {
    await db.product.updateMany({
      where: { id: ids[i], businessId: business.id },
      data: { sortOrder: i },
    });
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث ترتيب المنتجات" };
}

export async function addServiceBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const payload = {
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    price: Number(formValue(formData, "price", "0")),
    durationMinutes: formValue(formData, "durationMinutes") ? Number(formValue(formData, "durationMinutes")) : null,
    bookingEnabled: formBool(formData, "bookingEnabled"),
    isActive: formBool(formData, "isActive"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات الخدمة غير صالحة" };
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "services");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة الخدمة" };
  }

  await db.service.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      durationMinutes: parsed.data.durationMinutes,
      imageUrl,
      bookingEnabled: parsed.data.bookingEnabled,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تمت إضافة الخدمة" };
}

export async function updateServiceBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const serviceId = formValue(formData, "serviceId");
  const service = await db.service.findFirst({ where: { id: serviceId, businessId: business.id } });
  if (!service) {
    return { error: "الخدمة غير موجودة" };
  }

  const payload = {
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    price: Number(formValue(formData, "price", "0")),
    durationMinutes: formValue(formData, "durationMinutes") ? Number(formValue(formData, "durationMinutes")) : null,
    bookingEnabled: formBool(formData, "bookingEnabled"),
    isActive: formBool(formData, "isActive"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات الخدمة غير صالحة" };
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "services");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة الخدمة" };
  }

  await db.service.update({
    where: { id: service.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      durationMinutes: parsed.data.durationMinutes,
      bookingEnabled: parsed.data.bookingEnabled,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الخدمة" };
}

export async function deleteServiceBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const serviceId = formValue(formData, "serviceId");
  const service = await db.service.findFirst({ where: { id: serviceId, businessId: business.id } });
  if (!service) {
    return { error: "الخدمة غير موجودة" };
  }

  await db.service.delete({ where: { id: service.id } });
  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حذف الخدمة" };
}

export async function addOfferBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const payload = {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    discountLabel: formValue(formData, "discountLabel"),
    startsAt: formValue(formData, "startsAt"),
    endsAt: formValue(formData, "endsAt"),
    isActive: formBool(formData, "isActive"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = offerSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات العرض غير صالحة" };
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "offers");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة العرض" };
  }

  await db.offer.create({
    data: {
      businessId: business.id,
      title: parsed.data.title,
      description: parsed.data.description,
      discountLabel: parsed.data.discountLabel,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      imageUrl,
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تمت إضافة العرض" };
}

export async function updateOfferBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const offerId = formValue(formData, "offerId");
  const offer = await db.offer.findFirst({ where: { id: offerId, businessId: business.id } });
  if (!offer) {
    return { error: "العرض غير موجود" };
  }

  const payload = {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    discountLabel: formValue(formData, "discountLabel"),
    startsAt: formValue(formData, "startsAt"),
    endsAt: formValue(formData, "endsAt"),
    isActive: formBool(formData, "isActive"),
    sortOrder: Number(formValue(formData, "sortOrder", "0")),
  };

  const parsed = offerSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات العرض غير صالحة" };
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadOptionalImage(formData, "imageFile", "offers");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر رفع صورة العرض" };
  }

  await db.offer.update({
    where: { id: offer.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discountLabel: parsed.data.discountLabel,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث العرض" };
}

export async function deleteOfferBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const offerId = formValue(formData, "offerId");
  const offer = await db.offer.findFirst({ where: { id: offerId, businessId: business.id } });
  if (!offer) {
    return { error: "العرض غير موجود" };
  }

  await db.offer.delete({ where: { id: offer.id } });
  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حذف العرض" };
}

export async function addGalleryItemBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const caption = formValue(formData, "caption");
  const sortOrder = Number(formValue(formData, "sortOrder", "0"));
  const imageUrl = await uploadOptionalImage(formData, "imageFile", "gallery");
  if (!imageUrl) {
    return { error: "صورة المعرض مطلوبة" };
  }

  await db.galleryItem.create({
    data: {
      businessId: business.id,
      imageUrl,
      caption: caption || null,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تمت إضافة صورة المعرض" };
}

export async function updateGalleryItemBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const galleryItemId = formValue(formData, "galleryItemId");
  const item = await db.galleryItem.findFirst({ where: { id: galleryItemId, businessId: business.id } });
  if (!item) {
    return { error: "الصورة غير موجودة" };
  }

  const caption = formValue(formData, "caption");
  const sortOrder = Number(formValue(formData, "sortOrder", "0"));

  await db.galleryItem.update({
    where: { id: item.id },
    data: {
      caption: caption || null,
      sortOrder: Number.isNaN(sortOrder) ? item.sortOrder : sortOrder,
      isActive: formBool(formData, "isActive"),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الصورة" };
}

export async function deleteGalleryItemBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const galleryItemId = formValue(formData, "galleryItemId");
  const item = await db.galleryItem.findFirst({ where: { id: galleryItemId, businessId: business.id } });
  if (!item) {
    return { error: "الصورة غير موجودة" };
  }

  await db.galleryItem.delete({ where: { id: item.id } });
  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حذف الصورة" };
}

export async function reorderGalleryBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const ids = formValue(formData, "orderedIds")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  for (let i = 0; i < ids.length; i += 1) {
    await db.galleryItem.updateMany({
      where: { id: ids[i], businessId: business.id },
      data: { sortOrder: i },
    });
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث ترتيب المعرض" };
}

export async function saveBrandingStepAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const primaryColor = formValue(formData, "primaryColor", "#5D43EF");
  const secondaryColor = formValue(formData, "secondaryColor", "#1E293B");
  const buttonColor = formValue(formData, "buttonColor", "#4F46E5");
  const buttonStyle = formValue(formData, "buttonStyle", "rounded");
  const cardStyle = formValue(formData, "cardStyle", "glass");

  await db.business.update({
    where: { id: business.id },
    data: {
      primaryColor,
      secondaryColor,
      buttonColor,
      buttonStyle,
      cardStyle,
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حفظ إعدادات الهوية" };
}

export async function publishBusinessAction(_prev: BuilderActionState, _formData: FormData): Promise<BuilderActionState> {
  void _prev;
  void _formData;

  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "لا يوجد نشاط جاهز للنشر" };
  }

  if (!business.name || business.name.trim().length < 2) {
    return { error: "اسم النشاط مطلوب قبل النشر" };
  }

  const parsedSlug = slugSchema.safeParse(normalizeSlug(business.slug));
  if (!parsedSlug.success) {
    return { error: "الرابط العام غير صالح" };
  }

  const conflict = await db.business.findFirst({
    where: {
      slug: parsedSlug.data,
      id: { not: business.id },
    },
  });
  if (conflict) {
    return { error: "الرابط العام مستخدم من نشاط آخر" };
  }

  const hasContact = Boolean(
    (business.whatsapp && business.whatsapp.trim()) ||
      (business.phone && business.phone.trim()) ||
      (business.email && business.email.trim()) ||
      (business.website && business.website.trim()),
  );

  if (!hasContact) {
    return { error: "أضف وسيلة تواصل واحدة على الأقل قبل النشر" };
  }

  await db.business.update({
    where: { id: business.id },
    data: {
      slug: parsedSlug.data,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/page-builder");
  revalidatePath(`/${parsedSlug.data}`);

  return { success: "مبروك، صفحتك أصبحت جاهزة لاستقبال العملاء" };
}

export async function addCustomButtonAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const title = formValue(formData, "title");
  const rawUrl = formValue(formData, "url");
  const url = normalizeUrl(rawUrl);

  if (title.length < 2) {
    return { error: "عنوان الزر مطلوب" };
  }

  if (!url) {
    return { error: "رابط الزر غير صالح" };
  }

  const maxSort = await db.socialLink.aggregate({
    where: { businessId: business.id },
    _max: { sortOrder: true },
  });

  await db.socialLink.create({
    data: {
      businessId: business.id,
      platform: title,
      url,
      isActive: true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  return { success: "تمت إضافة الزر" };
}

export async function updateCustomButtonAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const socialLinkId = formValue(formData, "socialLinkId");
  const existing = await db.socialLink.findFirst({ where: { id: socialLinkId, businessId: business.id } });
  if (!existing) {
    return { error: "الزر غير موجود" };
  }

  const title = formValue(formData, "title", existing.platform);
  const rawUrl = formValue(formData, "url", existing.url);
  const url = normalizeUrl(rawUrl);

  if (title.length < 2) {
    return { error: "عنوان الزر مطلوب" };
  }

  if (!url) {
    return { error: "رابط الزر غير صالح" };
  }

  await db.socialLink.update({
    where: { id: existing.id },
    data: {
      platform: title,
      url,
      isActive: formBool(formData, "isActive"),
    },
  });

  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الزر" };
}

export async function deleteCustomButtonAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const socialLinkId = formValue(formData, "socialLinkId");
  const existing = await db.socialLink.findFirst({ where: { id: socialLinkId, businessId: business.id } });
  if (!existing) {
    return { error: "الزر غير موجود" };
  }

  await db.socialLink.delete({ where: { id: existing.id } });

  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  return { success: "تم حذف الزر" };
}

export async function reorderCustomButtonsAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData);
  const { business } = await requireOwnedBusiness();
  if (!business) {
    return { error: "ابدأ بإنشاء النشاط أولاً" };
  }

  const ids = formValue(formData, "orderedIds")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  for (let i = 0; i < ids.length; i += 1) {
    await db.socialLink.updateMany({
      where: { id: ids[i], businessId: business.id },
      data: { sortOrder: i },
    });
  }

  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث ترتيب الأزرار" };
}
