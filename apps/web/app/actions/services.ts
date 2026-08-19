"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { getPlanEntitlements, limitReached } from "../lib/plan-entitlements";

async function ownedBusiness() { return getOwnedBusinessWithPlanForWrite(); }
function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function validName(value: string) { return value.length >= 2 && value.length <= 120; }
function validDescription(value: string) { return value.length <= 1000; }
function refresh(slug: string) {
  revalidatePath("/dashboard"); revalidatePath("/dashboard/services"); revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${slug}`);
}
async function lockServiceScope(tx: Prisma.TransactionClient, businessId: string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${businessId}:services`}))`; }

export async function addSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness(); if (!business) return;
  const name = text(formData, "name"), description = text(formData, "description");
  if (!validName(name) || !validDescription(description)) return;
  const entitlements = getPlanEntitlements(business.plan?.code);
  const result = await db.$transaction(async (tx) => {
    await lockServiceScope(tx, business.id);
    const serviceCount = await tx.service.count({ where: { businessId: business.id, deletedAt: null } });
    if (limitReached(serviceCount, entitlements.serviceLimit)) return "limit" as const;
    const max = await tx.service.aggregate({ where: { businessId: business.id, deletedAt: null }, _max: { sortOrder: true } });
    await tx.service.create({ data: { businessId: business.id, name, description: description || null, price: 0, isActive: true, bookingEnabled: false, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    return "created" as const;
  });
  if (result !== "created") return; refresh(business.slug);
}

export async function updateSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness(); if (!business) return;
  const id = text(formData, "id"), name = text(formData, "name"), description = text(formData, "description");
  if (!id || !validName(name) || !validDescription(description)) return;
  await db.service.updateMany({ where: { id, businessId: business.id, deletedAt: null }, data: { name, description: description || null, isActive: true } });
  refresh(business.slug);
}

export async function deleteSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness(); if (!business) return;
  const id = text(formData, "id"); if (!id) return;
  // Preserve historical references (orders/bookings/analytics). Removing a service from the live catalog is reversible.
  await db.service.updateMany({ where: { id, businessId: business.id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false, bookingEnabled: false } });
  refresh(business.slug);
}
