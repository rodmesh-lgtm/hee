import { UsersRound, ShieldCheck } from "lucide-react";
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
  const pendingInvitations = invitations.flatMap(row => { const invite = parseStaffInvitation(row.codeVerifier); return invite ? [{ row, invite }] : []; });
  return <div className="infro-staff-page"><header className="infro-staff-heading"><div><p className="infro-staff-eyebrow"><UsersRound size={18} aria-hidden="true"/>إدارة الفريق · {business.name}</p><h1>الموظفون والصلاحيات</h1><p className="mt-3">أضف أعضاء فريقك وحدد وصول كل موظف حسب مهامه. لا يبدأ وصول الموظف إلا بعد قبول الدعوة بالحساب المطابق لبريده.</p></div><span className="infro-staff-secure"><ShieldCheck size={17} aria-hidden="true"/>إدارة الوصول للمالك فقط</span></header><dl className="infro-staff-metrics" aria-label="حالة فريق العمل"><div><dt>الموظفون النشطون</dt><dd>{members.filter(m => m.status === "active").length}</dd></div><div><dt>دعوات بانتظار القبول</dt><dd>{pendingInvitations.length}</dd></div><div><dt>الوصول الموقوف أو الملغى</dt><dd>{members.filter(m => m.status !== "active").length}</dd></div></dl><section className="infro-staff-section"><h2>إضافة موظف جديد</h2><p className="infro-staff-description">١. أدخل اسم الموظف وبريده · ٢. حدد الأقسام ومستوى واتساب عند الحاجة · ٣. أرسل الدعوة وتابع قبولها أدناه.</p><InviteStaffForm /></section><section className="space-y-3"><h2 className="text-lg font-black">الموظفون ({members.length})</h2>{members.length ? members.map(member => <StaffMemberForm key={`${member.id}:${member.updatedAt.toISOString()}`} member={{ id: member.id, name: member.user.name, email: member.user.email, role: member.role, status: member.status, permissions: member.permissions }} />) : <div className="infro-staff-empty"><UsersRound size={26} className="mx-auto mb-3" aria-hidden="true"/><b>لا يوجد موظفون مضافون بعد</b><p>ابدأ بإرسال دعوة من النموذج أعلاه. تظهر حسابات الفريق هنا بعد قبول الدعوة.</p></div>}</section>{pendingInvitations.length ? <section className="space-y-3"><h2 className="text-lg font-black">دعوات بانتظار القبول</h2>{pendingInvitations.map(({row,invite}) =>  <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><b>{invite.name}</b><p dir="ltr" className="text-sm text-slate-500">{invite.email}</p></div><form action={revokeStaffInvitationAction}><input type="hidden" name="invitationId" value={row.id} /><button className="min-h-11 rounded-xl border px-4 text-sm font-bold text-rose-700">إلغاء الدعوة</button></form></article>)}</section> : null}</div>;
}
