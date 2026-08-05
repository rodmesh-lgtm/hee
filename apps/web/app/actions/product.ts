"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForWrites } from "../lib/auth";
import { productSchema } from "../lib/validation";

export type ActionState = {
  error?: string;
};

const limits = {
  FREE: 3,
  BUSINESS: 10,
  PRO: 30,
} as const;

export async function addProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: { plan: true },
  });
  if (!business) {
    return { error: "يرجى إنشاء نشاط أولاً" };
  }

  const count = await db.product.count({ where: { businessId: business.id } });
  const planCode = business.plan?.code?.toUpperCase();
  const limit = planCode && planCode in limits ? limits[planCode as keyof typeof limits] : limits.FREE;
  if (count >= limit) {
    return { error: `وصلت إلى الحد المسموح به (${limit} منتجات)` };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    price: String(formData.get("price") ?? ""),
    oldPrice: String(formData.get("oldPrice") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: String(formData.get("isActive") ?? "on") === "on",
  };

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة";
    return { error: message };
  }

  await db.product.create({
    data: {
      businessId: business.id,
      ...parsed.data,
    },
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
  redirect("/dashboard/products");
}

export async function updateProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  const id = String(formData.get("productId") ?? "");
  const product = await db.product.findFirst({
    where: {
      id,
      business: {
        ownerId: user.id,
      },
    },
  });

  if (!product) {
    return { error: "المنتج غير موجود أو لا تملك صلاحية تعديله" };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    price: String(formData.get("price") ?? ""),
    oldPrice: String(formData.get("oldPrice") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: String(formData.get("isActive") ?? "off") === "on",
  };

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة";
    return { error: message };
  }

  await db.product.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function deleteProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUserForWrites();
  if (!user) {
    return { error: "وضع المعاينة QA للقراءة فقط" };
  }

  const id = String(formData.get("productId") ?? "");
  const product = await db.product.findFirst({
    where: {
      id,
      business: {
        ownerId: user.id,
      },
    },
  });

  if (!product) {
    return { error: "المنتج غير موجود أو لا تملك صلاحية حذفه" };
  }

  await db.product.delete({ where: { id } });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}
