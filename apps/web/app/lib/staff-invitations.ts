import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { staffSections, type StaffSection } from "./staff-permissions";

export const STAFF_INVITE_PROVIDER = "business-staff-invite";
export const STAFF_INVITE_COOKIE = "infro_staff_invite";
export type StaffInvitation = { name: string; email: string; permissions: StaffSection[]; role: "admin" | "marketer" | "support" | "viewer" };
export function inviteHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function parseStaffInvitation(value: string | null): StaffInvitation | null {
  try {
    const data = JSON.parse(value ?? "null");
    if (!data || typeof data.name !== "string" || typeof data.email !== "string" || !["admin", "marketer", "support", "viewer"].includes(data.role)) return null;
    return { name: data.name, email: data.email, permissions: staffSections(data.permissions), role: data.role };
  } catch { return null; }
}
export async function readStaffInvitation(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db.oAuthState.findFirst({ where: { state: inviteHash(token), provider: STAFF_INVITE_PROVIDER, expiresAt: { gt: new Date() } } });
  const invitation = row ? parseStaffInvitation(row.codeVerifier) : null;
  if (!row || !invitation) return null;
  const business = await db.business.findFirst({ where: { id: row.nonce, deletedAt: null }, select: { id: true, name: true, ownerId: true } });
  return business ? { row, invitation, business } : null;
}
export async function pendingStaffInvitePath() {
  const token = (await cookies()).get(STAFF_INVITE_COOKIE)?.value ?? "";
  return /^[a-f0-9]{64}$/.test(token) && await readStaffInvitation(token) ? `/join-team?token=${token}` : null;
}
