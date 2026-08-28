import "server-only";

import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE } from "../active-business";
import { getCurrentUser, getCurrentUserForWrites } from "../auth";
import { db } from "../db";

export const WHATSAPP_PERMISSIONS = ["view", "reply", "campaign.manage", "connection.manage", "audit.view"] as const;
export type WhatsAppPermission = (typeof WHATSAPP_PERMISSIONS)[number];
export type WhatsAppRole = "owner" | "admin" | "marketer" | "support" | "viewer";

const ROLE_PERMISSIONS: Record<WhatsAppRole, ReadonlySet<WhatsAppPermission>> = {
  owner: new Set(WHATSAPP_PERMISSIONS),
  admin: new Set(WHATSAPP_PERMISSIONS),
  marketer: new Set(["view", "reply", "campaign.manage"]),
  support: new Set(["view", "reply"]),
  viewer: new Set(["view"]),
};

export function roleCan(role: WhatsAppRole, permission: WhatsAppPermission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

async function authorizedContext(userId: string, permission: WhatsAppPermission) {
  const requested = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value?.trim() || null;
  const access = { OR: [{ ownerId: userId }, { members: { some: { userId, status: "active" } } }] };
  const select = { id: true, ownerId: true, members: { where: { userId, status: "active" }, select: { role: true }, take: 1 } } as const;
  const business = requested
    ? await db.business.findFirst({ where: { id: requested, deletedAt: null, ...access }, select })
    : await db.business.findFirst({ where: { deletedAt: null, ...access }, select, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (!business) return null;
  const role: WhatsAppRole = business.ownerId === userId ? "owner" : business.members[0]?.role as WhatsAppRole;
  if (!role || !roleCan(role, permission)) return null;
  return { businessId: business.id, userId, role };
}

export async function getWhatsAppReadContext(permission: WhatsAppPermission) {
  const user = await getCurrentUser();
  return user ? authorizedContext(user.id, permission) : null;
}

export async function getWhatsAppWriteContext(permission: WhatsAppPermission) {
  const user = await getCurrentUserForWrites();
  return authorizedContext(user.id, permission);
}
