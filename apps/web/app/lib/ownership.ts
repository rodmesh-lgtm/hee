import "server-only";

import type { StaffSection } from "./staff-permissions";
import { db } from "./db";
import { getCurrentUser, getCurrentUserForApiWrite, getCurrentUserForWrites } from "./auth";
import { getActiveBusinessForUser, getActiveBusinessWithPlanForUser } from "./active-business";

export async function getOwnedBusinessForRead(section?: StaffSection) {
  const user = await getCurrentUser();
  if (!user) return null;
  return getActiveBusinessForUser(user.id, section);
}

export async function getOwnedBusinessWithPlanForRead(section?: StaffSection) {
  const user = await getCurrentUser();
  if (!user) return null;
  return getActiveBusinessWithPlanForUser(user.id, section);
}

export async function getOwnedBusinessForApiWrite(section?: StaffSection) {
  const user = await getCurrentUserForApiWrite();
  if (!user) return null;
  return getActiveBusinessForUser(user.id, section);
}

export async function getOwnedBusinessForWrite(section?: StaffSection) {
  const user = await getCurrentUserForWrites();
  return getActiveBusinessForUser(user.id, section);
}

export async function getOwnedBusinessWithPlanForWrite(section?: StaffSection) {
  const user = await getCurrentUserForWrites();
  return getActiveBusinessWithPlanForUser(user.id, section);
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
