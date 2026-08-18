"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite, ownsBusinessRecord } from "../lib/ownership";
import { getPlanEntitlements, limitReached } from "../lib/plan-entitlements";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { productSchema } from "../lib/validation";

export type ActionState = { error?: string };

export async function addProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { error: "يرجى إنشاء نشاط أولاً أو الخروج من وضع المعاينة" };

  const entitlements = getPlanEntitlements(business.plan?.code);
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

  const created = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${business.id}:products`}))`;
    const count = await tx.product.count({ where: { businessId: business.id, deletedAt: null } });
    if (limitReached(count, entitlements.productLimit)) return false;
    await tx.product.create({ data: { businessId: business.id, ...parsed.data } });
    return true;
  });

  if (!created) {
    return { error: `وصلت إلى الحد المسموح به (${entitlements.productLimit} منتجات)` };
  }

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

  const previous = await db.product.findFirst({ where: { id, businessId: business.id, deletedAt: null }, select: { imageUrl: true } });
  if (!previous) return { error: "المنتج غير موجود أو تم حذفه" };
  await db.product.update({ where: { id }, data: parsed.data });
  try { await removeReplacedPersistentUrl(previous.imageUrl, parsed.data.imageUrl); } catch (error) { console.error("Failed to clean replaced product image", error); }
  revalidatePath("/dashboard/products");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/products");
}

export async function deleteProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { error: "لا يوجد نشاط متاح للتعديل" };
  const id = String(formData.get("productId") ?? "").trim();
  if (!(await ownsBusinessRecord("product", id, business.id))) return { error: "المنتج غير موجود أو لا تملك صلاحية حذفه" };

  const previous = await db.product.findFirst({ where: { id, businessId: business.id, deletedAt: null }, select: { imageUrl: true } });
  if (!previous) return { error: "المنتج غير موجود أو تم حذفه" };
  await db.product.deleteMany({ where: { id, businessId: business.id, deletedAt: null } });
  try { await removePersistentUrl(previous.imageUrl); } catch (error) { console.error("Failed to clean deleted product image", error); }
  revalidatePath("/dashboard/products");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/products");
}
