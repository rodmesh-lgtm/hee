"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanEntitlements, limitReached } from "../lib/plan-entitlements";

async function ownedBusiness() {
  return getOwnedBusinessWithPlanForWrite();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validName(value: string) {
  return value.length >= 2 && value.length <= 120;
}

function validDescription(value: string) {
  return value.length <= 1000;
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
  if (!validName(name) || !validDescription(description)) return;

  const entitlements = getPlanEntitlements(business.plan?.code);
  const serviceCount = await db.service.count({ where: { businessId: business.id, deletedAt: null } });
  if (limitReached(serviceCount, entitlements.serviceLimit)) return;

  const max = await db.service.aggregate({ where: { businessId: business.id, deletedAt: null }, _max: { sortOrder: true } });
  await db.service.create({
    data: {
      businessId: business.id,
      name,
      description: description || null,
      price: 0,
      isActive: true,
      bookingEnabled: false,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  refresh(business.slug);
}

export async function updateSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;

  const id = text(formData, "id");
  const name = text(formData, "name");
  const description = text(formData, "description");
  if (!id || !validName(name) || !validDescription(description)) return;

  await db.service.updateMany({
    where: { id, businessId: business.id, deletedAt: null },
    data: { name, description: description || null, isActive: true },
  });
  refresh(business.slug);
}

export async function deleteSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;

  const id = text(formData, "id");
  if (!id) return;

  await db.service.deleteMany({ where: { id, businessId: business.id, deletedAt: null } });
  refresh(business.slug);
}
