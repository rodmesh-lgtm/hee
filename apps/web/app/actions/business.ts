"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getPersistentStorageAdapter } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export type ActionState = { error?: string; success?: string };

function tenantFolder(folder: "logos" | "covers", businessId: string) {
  return `${folder}/${businessId}`;
}

async function uploadBusinessImage(file: File, folder: "logos" | "covers", businessId: string) {
  if (file.size === 0) return "";
  return (await getPersistentStorageAdapter().upload({ file, folder: tenantFolder(folder, businessId) })).url;
}

async function cleanupUploadedBusinessImages(businessId: string, logoUrl?: string, coverUrl?: string) {
  try {
    await Promise.all([
      removePersistentUrl(logoUrl, tenantFolder("logos", businessId)),
      removePersistentUrl(coverUrl, tenantFolder("covers", businessId)),
    ]);
  } catch (error) {
    console.error("Failed to clean uncommitted business images", error);
  }
}

async function cleanupReplacedBusinessImages(
  businessId: string,
  previous: { logoUrl?: string | null; coverUrl?: string | null } | null | undefined,
  next: { logoUrl?: string | null; coverUrl?: string | null },
) {
  try {
    // Only remove objects from this tenant's namespace. Legacy pre-namespace files are
    // intentionally left for the guarded orphan audit rather than risking cross-tenant deletion.
    await Promise.all([
      removeReplacedPersistentUrl(previous?.logoUrl, next.logoUrl, tenantFolder("logos", businessId)),
      removeReplacedPersistentUrl(previous?.coverUrl, next.coverUrl, tenantFolder("covers", businessId)),
    ]);
  } catch (error) {
    console.error("Failed to clean replaced business images", error);
  }
}

export async function updateBusinessBrandingImagesAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "وضع المعاينة QA للقراءة فقط" };

  const business = await getActiveBusinessForUser(user.id);
  if (!business) return { error: "لا يوجد نشاط مرتبط بهذا الحساب" };

  try {
    const rate = await consumePublicWriteLimit({ scope: "branding-images", businessId: business.id, identity: user.id, limit: 30, windowSeconds: 60 * 60 });
    if (!rate.allowed) return { error: "تم رفع صور كثيرة خلال وقت قصير. حاول مرة أخرى لاحقاً." };
  } catch (error) {
    console.error("[branding-images] rate_limit_failed", { businessId: business.id, error });
    return { error: "تعذر التحقق من عملية الرفع الآن. حاول مرة أخرى بعد قليل." };
  }

  const logoFile = formData.get("logoFile");
  const coverFile = formData.get("coverFile");
  const nextData: { logoUrl?: string; coverUrl?: string } = {};

  try {
    if (logoFile instanceof File && logoFile.size > 0) nextData.logoUrl = await uploadBusinessImage(logoFile, "logos", business.id);
    if (coverFile instanceof File && coverFile.size > 0) nextData.coverUrl = await uploadBusinessImage(coverFile, "covers", business.id);
  } catch (error) {
    await cleanupUploadedBusinessImages(business.id, nextData.logoUrl, nextData.coverUrl);
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }

  if (!nextData.logoUrl && !nextData.coverUrl) return { error: "اختر شعاراً أو صورة غلاف قبل الحفظ" };

  let previous: { logoUrl: string | null; coverUrl: string | null } | null = null;
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`branding-images:${business.id}`}))`;
      const current = await tx.business.findFirst({
        where: { id: business.id, ownerId: user.id, deletedAt: null },
        select: { logoUrl: true, coverUrl: true },
      });
      if (!current) return null;
      const updated = await tx.business.updateMany({
        where: { id: business.id, ownerId: user.id, deletedAt: null },
        data: nextData,
      });
      if (updated.count !== 1) return null;
      return current;
    });
    if (!result) {
      await cleanupUploadedBusinessImages(business.id, nextData.logoUrl, nextData.coverUrl);
      return { error: "تعذر العثور على النشاط أو لم يعد متاحاً للتعديل" };
    }
    previous = result;
  } catch (error) {
    console.error("[branding-images] write_failed", { businessId: business.id, error });
    await cleanupUploadedBusinessImages(business.id, nextData.logoUrl, nextData.coverUrl);
    return { error: "تعذر حفظ صور الهوية. يرجى المحاولة مرة أخرى." };
  }

  await cleanupReplacedBusinessImages(business.id, previous, {
    logoUrl: nextData.logoUrl ?? previous.logoUrl,
    coverUrl: nextData.coverUrl ?? previous.coverUrl,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/branding");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الهوية والصور بنجاح" };
}
