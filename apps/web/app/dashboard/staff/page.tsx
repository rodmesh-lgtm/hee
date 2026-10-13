import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { db } from "../../lib/db";
import { parseStaffInvitation, STAFF_INVITE_PROVIDER } from "../../lib/staff-invitations";
import { InviteStaffForm, StaffMemberForm } from "../../../components/dashboard/staff-forms";
import { revokeStaffInvitationAction } from "../../actions/staff";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return <p>إدارة الموظفين والصلاحيات متاحة لمالك المنشأة فقط.</p>;
  const [members, invitations] = await Promise.all([
    db.businessMember.findMany({ where: { businessId: business.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
    db.oAuthState.findMany({ where: { provider: STAFF_INVITE_PROVIDER, nonce: business.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <div className="space-y-5"><header className="rounded-3xl bg-[#07181b] p-6 text-white"><h1 className="text-2xl font-black">الموظفون والصلاحيات</h1><p className="mt-3 text-sm leading-7 text-slate-300">أضف فريق {business.name} وحدد الأقسام التي يستطيع كل موظف فتحها والعمل فيها.</p></header><section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-black">إضافة موظف جديد</h2><InviteStaffForm /></section><section className="space-y-3"><h2 className="text-lg font-black">الموظفون ({members.length})</h2>{members.length ? members.map(member => <StaffMemberForm key={`${member.id}:${member.updatedAt.toISOString()}`} member={{ id: member.id, name: member.user.name, email: member.user.email, role: member.role, status: member.status, permissions: member.permissions }} />) : <p className="rounded-2xl border border-dashed p-5 text-sm text-slate-500">لم تتم إضافة موظفين بعد. أرسل أول دعوة من النموذج أعلاه.</p>}</section>{invitations.length ? <section className="space-y-3"><h2 className="text-lg font-black">دعوات بانتظار القبول</h2>{invitations.map(row => { const invite = parseStaffInvitation(row.codeVerifier); return invite ? <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><b>{invite.name}</b><p dir="ltr" className="text-sm text-slate-500">{invite.email}</p></div><form action={revokeStaffInvitationAction}><input type="hidden" name="invitationId" value={row.id} /><button className="min-h-11 rounded-xl border px-4 text-sm font-bold text-rose-700">إلغاء الدعوة</button></form></article> : null; })}</section> : null}</div>;
}
