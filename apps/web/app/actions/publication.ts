"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { db } from "../lib/db";
import { isBusinessSlugReserved } from "../lib/slug-alias";

export type PublicationActionState = { error?: string; success?: string };

export async function publishBusinessAction(previous: PublicationActionState, formData: FormData): Promise<PublicationActionState> {
  // The React action-state contract supplies both arguments even though publication
  // currently derives all authoritative data from the authenticated server context.
  void previous;
  void formData;

  const business = await getOwnedBusinessForWrite();
  if (!business) return { error: "لا يوجد نشاط جاهز للنشر" };
  if (!business.name?.trim() || business.name.trim().length < 2) return { error: "اسم النشاط مطلوب قبل النشر" };

  const owner = await db.user.findFirst({
    where: { id: business.ownerId, deletedAt: null },
    select: { emailVerifiedAt: true },
  });
  if (!owner?.emailVerifiedAt) {
    return { error: "أكد ملكية بريد حسابك من «الحساب والباقات» قبل نشر الصفحة" };
  }

  const slug = normalizePublicSlug(business.slug);
  if (!slug || !isValidPublicSlug(slug)) return { error: "الرابط العام غير صالح" };
  try {
    if (await isBusinessSlugReserved(slug, business.id)) return { error: "الرابط العام مستخدم أو محفوظ لنشاط آخر" };
  } catch (error) {
    console.error("[publication] failed to verify slug reservation", error);
    return { error: "تعذر التحقق من الرابط العام الآن. حاول مرة أخرى بعد قليل." };
  }

  const hasContact = Boolean(business.whatsapp?.trim() || business.phone?.trim() || business.email?.trim() || business.website?.trim());
  if (!hasContact) return { error: "أضف وسيلة تواصل واحدة على الأقل قبل النشر" };

  try {
    const updated = await db.business.updateMany({
      where: { id: business.id, ownerId: business.ownerId, deletedAt: null },
      data: { slug, isPublished: true, publishedAt: business.publishedAt ?? new Date() },
    });
    if (updated.count !== 1) return { error: "تعذر نشر الصفحة لأن النشاط لم يعد متاحًا للتعديل" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "الرابط العام مستخدم أو محفوظ لنشاط آخر" };
    throw error;
  }

  revalidatePath("/dashboard"); revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${slug}`);
  return { success: "مبروك، صفحتك أصبحت جاهزة للمشاركة" };
}

export async function unpublishBusinessAction() {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/onboarding");
  const updated = await db.business.updateMany({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, data: { isPublished: false } });
  if (updated.count !== 1) redirect("/onboarding");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${business.slug}`);
  redirect("/dashboard/my-page");
}
