"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite, ownsBusinessRecord } from "../lib/ownership";

const orderTransitions: Record<string, readonly string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "completed", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const bookingTransitions: Record<string, readonly string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/analytics");
}

export async function updateOrderStatusAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) return;

  const id = text(formData, "id");
  const nextStatus = text(formData, "status");
  if (!id || !nextStatus || !(await ownsBusinessRecord("order", id, business.id))) return;

  const order = await db.order.findFirst({ where: { id, businessId: business.id }, select: { status: true } });
  if (!order || !(orderTransitions[order.status] ?? []).includes(nextStatus)) return;

  await db.order.updateMany({
    where: { id, businessId: business.id, status: order.status },
    data: { status: nextStatus },
  });
  refresh();
}

export async function updateBookingStatusAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) return;

  const id = text(formData, "id");
  const nextStatus = text(formData, "status");
  if (!id || !nextStatus || !(await ownsBusinessRecord("booking", id, business.id))) return;

  const booking = await db.booking.findFirst({ where: { id, businessId: business.id }, select: { status: true } });
  if (!booking || !(bookingTransitions[booking.status] ?? []).includes(nextStatus)) return;

  await db.booking.updateMany({
    where: { id, businessId: business.id, status: booking.status },
    data: { status: nextStatus },
  });
  refresh();
}
