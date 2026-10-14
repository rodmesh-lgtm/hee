"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser, ACTIVE_BUSINESS_COOKIE, syncWorkspaceBusinessPreference } from "../lib/active-business";
import { db } from "../lib/db";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { staffSections } from "../lib/staff-permissions";
import { inviteHash, parseStaffInvitation, readStaffInvitation, STAFF_INVITE_COOKIE, STAFF_INVITE_PROVIDER } from "../lib/staff-invitations";
import { isExplicitTestRuntime } from "../lib/runtime-environment";
import { verificationOrigin } from "../lib/email-verification";

export type StaffActionState = { error?: string; success?: string; inviteUrl?: string };
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
function safeRole(form: FormData) { const role = text(form, "role"); return ["admin", "marketer", "support", "viewer"].includes(role) ? role : "viewer"; }

export async function inviteStaffAction(_state: StaffActionState, form: FormData): Promise<StaffActionState> {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id); // Owner-only; no section can delegate member administration.
  if (!business) return { error: "إدارة الموظفين متاحة لمالك المنشأة فقط." };
  const name = text(form, "name"), email = text(form, "email").toLowerCase();
  const permissions = staffSections(form.getAll("permissions"));
  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "أدخل اسمًا وبريدًا إلكترونيًا صحيحين للموظف." };
  if (!permissions.length) return { error: "اختر قسمًا واحدًا على الأقل." };
  if (email === user.email.toLowerCase()) return { error: "أنت مالك المنشأة بالفعل." };
  try {
    const rate = await consumePublicWriteLimit({ businessId: business.id, scope: "staff-invite", identity: user.id, limit: 20, windowSeconds: 3600 });
    if (!rate.allowed) return { error: "تم إنشاء دعوات كثيرة. حاول لاحقًا." };
    const member = await db.businessMember.findFirst({ where: { businessId: business.id, user: { email } }, select: { id: true } });
    if (member) return { error: "هذا الموظف موجود. عدّل صلاحياته من القائمة." };
    const token = randomBytes(32).toString("hex");
    const origin = verificationOrigin();
    if (!origin) return { error: "تعذر إنشاء رابط الدعوة الآن." };
    const inviteUrl = `${origin}/join-team?token=${token}`;
    const row = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-invite:${business.id}:${email}`}))`;
      await tx.oAuthState.deleteMany({ where: { provider: STAFF_INVITE_PROVIDER, nonce: business.id, redirectTo: email } });
      const created = await tx.oAuthState.create({ data: { provider: STAFF_INVITE_PROVIDER, nonce: business.id, state: inviteHash(token), redirectTo: email, codeVerifier: JSON.stringify({ name, email, permissions, role: safeRole(form) }), expiresAt: new Date(Date.now() + 7 * 86400_000) } });
      await tx.whatsAppAuditLog.create({ data: { businessId: business.id, actorUserId: user.id, action: "staff.invited", targetType: "staff-invitation", targetId: created.id, outcome: "success" } });
      return created;
    });
    let sent = false;
    if (!isExplicitTestRuntime() && process.env.RESEND_API_KEY && process.env.HEE_FROM_EMAIL) {
      try {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `staff-invite-${row.id}` }, body: JSON.stringify({ from: process.env.HEE_FROM_EMAIL, to: [email], subject: "دعوة للانضمام إلى فريق عمل في INFRO", text: `مرحبًا ${name}،\nدعتك منشأة ${business.name} للانضمام إلى فريقها في INFRO.\nافتح الرابط وسجّل الدخول بالبريد المدعو ثم اقبل الدعوة:\n${inviteUrl}\nالرابط صالح لمدة 7 أيام. إذا لم تكن تتوقع هذه الدعوة فتجاهلها.` }), signal: AbortSignal.timeout(10_000) });
        sent = response.ok;
      } catch { /* The owner can share the invitation link through their chosen channel. */ }
    }
    revalidatePath("/dashboard/staff");
    return { success: sent ? "أُرسلت الدعوة إلى بريد الموظف. يمكنه إنشاء حسابه وقبولها." : "تم إنشاء الدعوة. انسخ الرابط وأرسله للموظف لإكمال حسابه.", inviteUrl };
  } catch { return { error: "تعذر إنشاء الدعوة الآن. حاول مرة أخرى." }; }
}

export async function updateStaffAction(_state: StaffActionState, form: FormData): Promise<StaffActionState> {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return { error: "إدارة الموظفين متاحة للمالك فقط." };
  const status = text(form, "status"), id = text(form, "memberId");
  if (!["active", "suspended", "revoked"].includes(status)) return { error: "حالة غير صحيحة." };
  try {
    const updated = await db.$transaction(async tx => {
      const result = await tx.businessMember.updateMany({ where: { id, businessId: business.id, userId: { not: user.id } }, data: { status, permissions: staffSections(form.getAll("permissions")), role: safeRole(form) } });
      if (result.count) await tx.whatsAppAuditLog.create({ data: { businessId: business.id, actorUserId: user.id, action: "staff.permissions.updated", targetType: "business-member", targetId: id, outcome: "success", metadata: { status } } });
      return result.count;
    });
    if (!updated) return { error: "لم يتم العثور على الموظف في هذه المنشأة." };
    revalidatePath("/dashboard", "layout");
    return { success: "تم تحديث صلاحيات الموظف. تطبّق عند كل طلب جديد." };
  } catch { return { error: "تعذر حفظ الصلاحيات الآن." }; }
}

export async function revokeStaffInvitationAction(form: FormData) {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return;
  await db.oAuthState.deleteMany({ where: { id: text(form, "invitationId"), nonce: business.id, provider: STAFF_INVITE_PROVIDER } });
  revalidatePath("/dashboard/staff");
}

export async function startStaffJoinAction(form: FormData) {
  const token = text(form, "token");
  if (!await readStaffInvitation(token)) redirect("/join-team?status=invalid");
  (await cookies()).set(STAFF_INVITE_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && !isExplicitTestRuntime(), path: "/", maxAge: 7 * 86400 });
  redirect(text(form, "mode") === "register" ? "/register" : "/login");
}

export async function acceptStaffInvitationAction(form: FormData) {
  const user = await getCurrentUserForWrites();
  const token = text(form, "token");
  const invitation = await readStaffInvitation(token);
  if (!invitation || !user.emailVerifiedAt || invitation.invitation.email !== user.email.toLowerCase() || invitation.business.ownerId === user.id) redirect("/join-team?status=invalid");
  const accepted = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-invite-accept:${inviteHash(token)}`}))`;
    const pending = await tx.oAuthState.findFirst({ where: { id: invitation.row.id, provider: STAFF_INVITE_PROVIDER, state: inviteHash(token), expiresAt: { gt: new Date() } } });
    const data = pending ? parseStaffInvitation(pending.codeVerifier) : null;
    if (!pending || !data || data.email !== user.email.toLowerCase()) return false;
    if (!await tx.business.findFirst({ where: { id: pending.nonce, deletedAt: null } })) return false;
    const existing = await tx.businessMember.findUnique({ where: { businessId_userId: { businessId: pending.nonce, userId: user.id } } });
    // A stale invitation cannot reactivate a member whose owner has suspended/revoked access.
    if (existing) return false;
    const member = await tx.businessMember.create({ data: { businessId: pending.nonce, userId: user.id, role: data.role, permissions: data.permissions, status: "active" } });
    await tx.oAuthState.delete({ where: { id: pending.id } });
    await tx.whatsAppAuditLog.create({ data: { businessId: pending.nonce, actorUserId: user.id, action: "staff.joined", targetType: "business-member", targetId: member.id, outcome: "success" } });
    return true;
  });
  if (!accepted) redirect("/join-team?status=invalid");
  const jar = await cookies();
  jar.delete(STAFF_INVITE_COOKIE);
  jar.set(ACTIVE_BUSINESS_COOKIE, invitation.business.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && !isExplicitTestRuntime(), path: "/", maxAge: 365 * 86400 });
  await syncWorkspaceBusinessPreference(invitation.business.id);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
