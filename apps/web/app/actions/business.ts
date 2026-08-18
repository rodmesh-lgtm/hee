"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getPersistentStorageAdapter } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";

export type ActionState = { error?: string; success?: string };

async function uploadBusinessImage(file: File, folder: string) {
  if (file.size === 0) return "";
  return (await getPersistentStorageAdapter().upload({ file, folder })).url;
}

async function cleanupUploadedBusinessImages(logoUrl?: string, coverUrl?: string) {
  try {
    await Promise.all([
      removePersistentUrl(logoUrl, "logos"),
      removePersistentUrl(coverUrl, "covers"),
    ]);
  } catch (error) {
    console.error("Failed to clean uncommitted business images", error);
  }
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

export async function updateBusinessBrandingImagesAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "وضع المعاينة QA للقراءة فقط" };

  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  if (!business) return { error: "لا يوجد نشاط مرتبط بهذا الحساب" };

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
    await cleanupUploadedBusinessImages(nextData.logoUrl, nextData.coverUrl);
    return { error: error instanceof Error ? error.message : "تعذر رفع الصور" };
  }

  if (!nextData.logoUrl && !nextData.coverUrl) {
    return { error: "اختر شعاراً أو صورة غلاف قبل الحفظ" };
  }

  try {
    await db.business.update({ where: { id: business.id }, data: nextData });
  } catch {
    await cleanupUploadedBusinessImages(nextData.logoUrl, nextData.coverUrl);
    return { error: "تعذر حفظ صور الهوية. يرجى المحاولة مرة أخرى." };
  }

  await cleanupReplacedBusinessImages(business, {
    logoUrl: nextData.logoUrl ?? business.logoUrl,
    coverUrl: nextData.coverUrl ?? business.coverUrl,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/branding");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return { success: "تم تحديث الهوية والصور بنجاح" };
}
