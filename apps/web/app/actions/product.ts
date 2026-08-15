"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite, ownsBusinessRecord } from "../lib/ownership";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { productSchema } from "../lib/validation";

export type ActionState = { error?: string };

const limits = { FREE: 3, BUSINESS: 10, PRO: 30 } as const;

export async function addProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { error: "يرجى إنشاء نشاط أولاً أو الخروج من وضع المعاينة" };

  const count = await db.product.count({ where: { businessId: business.id, deletedAt: null } });
  const planCode = business.plan?.code?.toUpperCase();
  const limit = planCode && planCode in limits ? limits[planCode as keyof typeof limits] : limits.FREE;
  if (count >= limit) return { error: `وصلت إلى الحد المسموح به (${limit} منتجات)` };

  const parsed = productSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    price: String(formData.get("price") ?? ""),
    oldPrice: String(formData.get("oldPrice") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: String(formData.get("isActive") ?? "on") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };

  await db.product.create({ data: { businessId: business.id, ...parsed.data } });
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/products");
}

export async function updateProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { error: "لا يوجد نشاط متاح للتعديل" };
  const id = String(formData.get("productId") ?? "").trim();
  if (!(await ownsBusinessRecord("product", id, business.id))) return { error: "المنتج غير موجود أو لا تملك صلاحية تعديله" };

  const parsed = productSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    price: String(formData.get("price") ?? ""),
    oldPrice: String(formData.get("oldPrice") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: String(formData.get("isActive") ?? "off") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };

  const previous = await db.product.findFirst({ where: { id, businessId: business.id }, select: { imageUrl: true } });
  await db.product.update({ where: { id }, data: parsed.data });
  try { await removeReplacedPersistentUrl(previous?.imageUrl, parsed.data.imageUrl); } catch (error) { console.error("Failed to clean replaced product image", error); }
  revalidatePath("/dashboard/products");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/products");
}

export async function deleteProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { error: "لا يوجد نشاط متاح للتعديل" };
  const id = String(formData.get("productId") ?? "").trim();
  if (!(await ownsBusinessRecord("product", id, business.id))) return { error: "المنتج غير موجود أو لا تملك صلاحية حذفه" };

  const previous = await db.product.findFirst({ where: { id, businessId: business.id }, select: { imageUrl: true } });
  await db.product.deleteMany({ where: { id, businessId: business.id } });
  try { await removePersistentUrl(previous?.imageUrl); } catch (error) { console.error("Failed to clean deleted product image", error); }
  revalidatePath("/dashboard/products");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/products");
}
