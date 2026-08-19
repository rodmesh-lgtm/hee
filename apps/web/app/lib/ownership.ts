import "server-only";

import { db } from "./db";
import { getCurrentUser, getCurrentUserForApiWrite, getCurrentUserForWrites } from "./auth";

export async function getOwnedBusinessForRead() {
  const user = await getCurrentUser();
  if (!user) return null;
  return db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
}

export async function getOwnedBusinessForApiWrite() {
  const user = await getCurrentUserForApiWrite();
  if (!user) return null;
  return db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
}

export async function getOwnedBusinessForWrite() {
  const user = await getCurrentUserForWrites();
  return db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
}

export async function getOwnedBusinessWithPlanForWrite() {
  const user = await getCurrentUserForWrites();
  return db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    include: { plan: true },
  });
}

export async function ownsBusinessRecord(
  kind: "branch" | "department" | "contactPerson" | "product" | "service" | "offer" | "customer" | "order" | "booking",
  recordId: string,
  businessId: string,
) {
  if (!recordId || !businessId) return false;
  switch (kind) {
    case "branch": return Boolean(await db.branch.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "department": return Boolean(await db.department.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "contactPerson": return Boolean(await db.contactPerson.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "product": return Boolean(await db.product.findFirst({ where: { id: recordId, businessId, deletedAt: null }, select: { id: true } }));
    case "service": return Boolean(await db.service.findFirst({ where: { id: recordId, businessId, deletedAt: null }, select: { id: true } }));
    case "offer": return Boolean(await db.offer.findFirst({ where: { id: recordId, businessId, deletedAt: null }, select: { id: true } }));
    case "customer": return Boolean(await db.customer.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "order": return Boolean(await db.order.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "booking": return Boolean(await db.booking.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
  }
}
