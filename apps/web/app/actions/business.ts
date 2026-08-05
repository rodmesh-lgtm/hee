"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUser } from "../lib/auth";
import { businessSchema } from "../lib/validation";

export type ActionState = {
  error?: string;
};

export async function createBusinessFromOnboarding(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    businessType: String(formData.get("businessType") ?? ""),
    description: String(formData.get("description") ?? ""),
    city: String(formData.get("city") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? "#6366f1"),
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

  const business = await db.business.create({
    data: {
      ownerId: user.id,
      ...parsed.data,
      isVerified: false,
      isPublished: true,
      plan: "FREE",
    },
  });

  revalidatePath("/dashboard");
  redirect(`/b/${business.slug}`);
}

export async function updateBusinessAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
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

export async function getBusinessByOwner(userId: string) {
  return db.business.findFirst({
    where: { ownerId: userId },
    include: {
      products: true,
    },
  });
}

export async function getBusinessPublic(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      products: { where: { isActive: true } },
    },
  });
}

export async function isSlugAvailable(slug: string) {
  const business = await db.business.findUnique({ where: { slug } });
  return !business;
}
