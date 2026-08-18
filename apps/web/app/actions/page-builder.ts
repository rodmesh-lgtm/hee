"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";

export type BuilderActionState = { error?: string; success?: string };

export async function publishBusinessAction(_prev: BuilderActionState, _formData: FormData): Promise<BuilderActionState> {
  const business = await getOwnedBusinessForWrite();
  if (!business) return { error: "لا يوجد نشاط متاح للنشر" };

  const name = business.name.trim();
  const description = (business.description || business.shortDescription || "").trim();
  const whatsapp = (business.whatsapp || "").trim();
  if (name.length < 2 || description.length < 2 || !whatsapp) {
    return { error: "أكمل اسم النشاط والنبذة ورقم واتساب قبل النشر." };
  }

  await db.business.update({
    where: { id: business.id },
    data: {
      isPublished: true,
      publishedAt: business.publishedAt ?? new Date(),
      onboardingCompleted: true,
      onboardingStep: "published",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  return { success: "تم نشر الصفحة بنجاح" };
}
