"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";

const TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  draft: ["cancelled"],
  submitted: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["fulfilled"],
};

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function transitionBusinessStoreOrderAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = text(formData.get("orderId"), 80);
  const nextStatus = text(formData.get("nextStatus"), 32);
  const note = text(formData.get("note"), 500) || null;

  if (!orderId || !nextStatus) redirect("/admin/store-orders?result=invalid");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`admin-business-store-order:${orderId}`}))`);
    const rows = await tx.$queryRaw<Array<{
      id: string;
      status: string;
      paymentStatus: string;
    }>>(Prisma.sql`
      SELECT "id", "status", "paymentStatus"
      FROM "BusinessStoreOrder"
      WHERE "id" = ${orderId}
      FOR UPDATE
    `);
    const order = rows[0];
    if (!order) return "missing" as const;

    if (!(TRANSITIONS[order.status] ?? []).includes(nextStatus)) return "invalid-transition" as const;
    if (["processing", "shipped", "fulfilled"].includes(nextStatus) && order.paymentStatus !== "paid") {
      return "payment-required" as const;
    }
    // A paid order must not be silently cancelled. Refund/reversal evidence belongs
    // to the future dedicated Business Store payment domain, not an admin shortcut.
    if (nextStatus === "cancelled" && order.paymentStatus === "paid") return "refund-required" as const;

    const timestamps = nextStatus === "cancelled"
      ? Prisma.sql`, "cancelledAt" = CURRENT_TIMESTAMP`
      : nextStatus === "fulfilled"
        ? Prisma.sql`, "fulfilledAt" = CURRENT_TIMESTAMP`
        : Prisma.empty;

    const changed = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessStoreOrder"
      SET "status" = ${nextStatus}, "updatedAt" = CURRENT_TIMESTAMP ${timestamps}
      WHERE "id" = ${order.id} AND "status" = ${order.status}
    `);
    if (Number(changed) !== 1) return "conflict" as const;

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "BusinessStoreOrderAudit"
        ("id", "orderId", "actorUserId", "action", "fromStatus", "toStatus", "paymentStatus", "note")
      VALUES
        (${randomUUID()}, ${order.id}, ${admin.id}, 'status_transition', ${order.status}, ${nextStatus}, ${order.paymentStatus}, ${note})
    `);
    return "updated" as const;
  });

  revalidatePath("/admin/store-orders");
  revalidatePath(`/admin/store-orders/${orderId}`);
  redirect(`/admin/store-orders/${orderId}?result=${result}`);
}
