import "server-only";

import { getDashboardBusinessForUser } from "../active-business";
import { memberCanAccess } from "../staff-permissions";
import { getCurrentUser, getCurrentUserForWrites } from "../auth";

export const WHATSAPP_PERMISSIONS = ["view", "reply", "inbox.manage", "campaign.manage", "automation.manage", "connection.manage", "audit.view"] as const;
export type WhatsAppPermission = (typeof WHATSAPP_PERMISSIONS)[number];
export type WhatsAppRole = "owner" | "admin" | "marketer" | "support" | "viewer";

const ROLE_PERMISSIONS: Record<WhatsAppRole, ReadonlySet<WhatsAppPermission>> = {
  owner: new Set(WHATSAPP_PERMISSIONS),
  admin: new Set(WHATSAPP_PERMISSIONS),
  marketer: new Set(["view", "reply", "campaign.manage", "automation.manage"]),
  support: new Set(["view", "reply", "inbox.manage"]),
  viewer: new Set(["view"]),
};

export function roleCan(role: WhatsAppRole, permission: WhatsAppPermission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

async function authorizedContext(userId: string, permission: WhatsAppPermission) {
  const business = await getDashboardBusinessForUser(userId);
  if (!business) return null;
  if (business.ownerId !== userId && !memberCanAccess(business.members[0]?.permissions, "whatsapp")) return null;
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
