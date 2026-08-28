"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite, ownsBusinessRecord } from "../lib/ownership";
import { cancelWhatsAppAppointmentReminders, emitInternalWhatsAppAutomationEvent, scheduleWhatsAppAppointmentReminders } from "../lib/whatsapp/automation-event-producer";

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

  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Order" WHERE "id" = ${id} AND "businessId" = ${business.id} FOR UPDATE
    `);
    if (!rows[0]) return;
    const order = await tx.order.findFirst({
      where: { id, businessId: business.id },
      select: { id: true, status: true, customer: { select: { phone: true } } },
    });
    if (!order || !(orderTransitions[order.status] ?? []).includes(nextStatus)) return;
    const updated = await tx.order.updateMany({
      where: { id, businessId: business.id, status: order.status },
      data: { status: nextStatus },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CONFLICT");
    await emitInternalWhatsAppAutomationEvent({
      database: tx,
      businessId: business.id,
      source: "ir.order.status",
      externalEventId: `${order.id}:${nextStatus}`,
      triggerType: "order_update",
      subjectType: `order.status.${nextStatus}`,
      subjectId: order.id,
      customerPhone: order.customer.phone,
    });
    if (nextStatus === "completed") {
      await emitInternalWhatsAppAutomationEvent({
        database: tx,
        businessId: business.id,
        source: "ir.order.follow-up",
        externalEventId: `${order.id}:completed`,
        triggerType: "follow_up",
        subjectType: "order.completed",
        subjectId: order.id,
        customerPhone: order.customer.phone,
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  refresh();
}

export async function updateBookingStatusAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) return;

  const id = text(formData, "id");
  const nextStatus = text(formData, "status");
  if (!id || !nextStatus || !(await ownsBusinessRecord("booking", id, business.id))) return;

  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Booking" WHERE "id" = ${id} AND "businessId" = ${business.id} FOR UPDATE
    `);
    if (!rows[0]) return;
    const booking = await tx.booking.findFirst({
      where: { id, businessId: business.id },
      select: { id: true, status: true, bookingDate: true, bookingTime: true, customer: { select: { phone: true } } },
    });
    if (!booking || !(bookingTransitions[booking.status] ?? []).includes(nextStatus)) return;
    const updated = await tx.booking.updateMany({
      where: { id, businessId: business.id, status: booking.status }, data: { status: nextStatus },
    });
    if (updated.count !== 1) throw new Error("BOOKING_STATUS_CONFLICT");
    if (nextStatus === "confirmed") {
      await scheduleWhatsAppAppointmentReminders({
        database: tx, businessId: business.id, bookingId: booking.id,
        bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, customerPhone: booking.customer.phone,
      });
    } else {
      await cancelWhatsAppAppointmentReminders({ database: tx, businessId: business.id, bookingId: booking.id });
      if (nextStatus === "completed") {
        await emitInternalWhatsAppAutomationEvent({
          database: tx,
          businessId: business.id,
          source: "ir.booking.follow-up",
          externalEventId: `${booking.id}:completed`,
          triggerType: "follow_up",
          subjectType: "booking.completed",
          subjectId: booking.id,
          customerPhone: booking.customer.phone,
        });
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  refresh();
}
