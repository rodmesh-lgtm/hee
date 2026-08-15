import "server-only";

import { db } from "./db";
import { getCurrentUser, getCurrentUserForWrites } from "./auth";

export type OwnedBusiness = Awaited<ReturnType<typeof getOwnedBusinessForRead>>;

export async function getOwnedBusinessForRead<T extends object = object>(args?: {
  select?: T;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  return db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    ...(args?.select ? { select: args.select } : {}),
  } as never);
}

export async function getOwnedBusinessForWrite<T extends object = object>(args?: {
  select?: T;
  include?: T;
}) {
  const user = await getCurrentUserForWrites();
  if (!user) return null;

  return db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    ...(args?.select ? { select: args.select } : {}),
    ...(args?.include ? { include: args.include } : {}),
  } as never);
}

export async function ownsBusinessRecord(
  kind: "branch" | "department" | "contactPerson" | "product" | "service" | "offer" | "customer" | "order" | "booking",
  recordId: string,
  businessId: string,
) {
  if (!recordId || !businessId) return false;

  switch (kind) {
    case "branch":
      return Boolean(await db.branch.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "department":
      return Boolean(await db.department.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "contactPerson":
      return Boolean(await db.contactPerson.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "product":
      return Boolean(await db.product.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "service":
      return Boolean(await db.service.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "offer":
      return Boolean(await db.offer.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "customer":
      return Boolean(await db.customer.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "order":
      return Boolean(await db.order.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
    case "booking":
      return Boolean(await db.booking.findFirst({ where: { id: recordId, businessId }, select: { id: true } }));
  }
}
