"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUser } from "../lib/auth";
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
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    return { error: "يرجى إنشاء نشاط أولاً" };
  }

  const count = await db.product.count({ where: { businessId: business.id } });
  const limit = limits[business.plan as keyof typeof limits] ?? limits.FREE;
  if (count >= limit) {
    return { error: `وصلت إلى الحد المسموح به (${limit} منتجات)` };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
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
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
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
    price: String(formData.get("price") ?? ""),
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
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
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
