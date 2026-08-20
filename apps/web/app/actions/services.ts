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
function optionalInt(formData: FormData, key: string, min: number, max: number) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}
function refresh(slug: string) {
  revalidatePath("/dashboard"); revalidatePath("/dashboard/services"); revalidatePath("/dashboard/my-page"); revalidatePath("/dashboard/inbox"); revalidatePath("/preview"); revalidatePath(`/${slug}`);
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
  const price = optionalInt(formData, "price", 0, 100000000);
  const durationMinutes = optionalInt(formData, "durationMinutes", 5, 1440);
  const bookingEnabled = formData.get("bookingEnabled") === "on";
  if (!id || !validName(name) || !validDescription(description) || price === undefined || durationMinutes === undefined) return;
  await db.service.updateMany({
    where: { id, businessId: business.id, deletedAt: null },
    data: { name, description: description || null, price: price ?? 0, durationMinutes, bookingEnabled, isActive: true },
  });
  refresh(business.slug);
}

export async function updateBookingAvailabilityAction(formData: FormData) {
  const business = await ownedBusiness(); if (!business) return;
  const enabled = formData.get("bookingAvailable") === "on";
  await db.business.updateMany({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, data: { bookingAvailable: enabled } });
  refresh(business.slug);
}

export async function deleteSimpleServiceAction(formData: FormData) {
  const business = await ownedBusiness(); if (!business) return;
  const id = text(formData, "id"); if (!id) return;
  // Preserve historical references (orders/bookings/analytics). Removing a service from the live catalog is reversible.
  await db.service.updateMany({ where: { id, businessId: business.id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false, bookingEnabled: false } });
  refresh(business.slug);
}
