"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { db } from "../lib/db";

export type PublicationActionState = { error?: string; success?: string };

export async function publishBusinessAction(_previous: PublicationActionState, _formData: FormData): Promise<PublicationActionState> {
  const business = await getOwnedBusinessForWrite();
  if (!business) return { error: "لا يوجد نشاط جاهز للنشر" };

  if (!business.name?.trim() || business.name.trim().length < 2) return { error: "اسم النشاط مطلوب قبل النشر" };

  const slug = normalizePublicSlug(business.slug);
  if (!slug || !isValidPublicSlug(slug)) return { error: "الرابط العام غير صالح" };

  // Business.slug is globally unique in the database, including soft-deleted rows.
  // Match that rule here so the UI never reports an old historical slug as available
  // only for the final update to fail with a unique-constraint error.
  const conflict = await db.business.findFirst({
    where: { slug, id: { not: business.id } },
    select: { id: true },
  });
  if (conflict) return { error: "الرابط العام مستخدم من نشاط آخر" };

  const hasContact = Boolean(
    business.whatsapp?.trim() || business.phone?.trim() || business.email?.trim() || business.website?.trim(),
  );
  if (!hasContact) return { error: "أضف وسيلة تواصل واحدة على الأقل قبل النشر" };

  try {
    await db.business.update({
      where: { id: business.id },
      data: { slug, isPublished: true, publishedAt: business.publishedAt ?? new Date() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "الرابط العام مستخدم من نشاط آخر" };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${slug}`);
  return { success: "مبروك، صفحتك أصبحت جاهزة للمشاركة" };
}

export async function unpublishBusinessAction() {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/onboarding");

  await db.business.update({ where: { id: business.id }, data: { isPublished: false } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/my-page");
}
