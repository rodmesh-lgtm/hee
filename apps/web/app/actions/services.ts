"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";

async function ownedBusiness() {
  return getOwnedBusinessForWrite();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refresh(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${slug}`);
}

export async function addSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const name = text(formData, "name");
  const description = text(formData, "description");
  if (name.length < 2) return;
  const max = await db.service.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } });
  await db.service.create({ data: { businessId: business.id, name, description: description || null, price: 0, isActive: true, bookingEnabled: false, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  refresh(business.slug);
}

export async function updateSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  const description = text(formData, "description");
  if (!id || name.length < 2) return;
  await db.service.updateMany({ where: { id, businessId: business.id }, data: { name, description: description || null, isActive: true } });
  refresh(business.slug);
}

export async function deleteSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  if (!id) return;
  await db.service.deleteMany({ where: { id, businessId: business.id } });
  refresh(business.slug);
}
