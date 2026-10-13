import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "../lib/auth";
import { readStaffInvitation } from "../lib/staff-invitations";
import { STAFF_SECTIONS } from "../lib/staff-permissions";
import { acceptStaffInvitationAction, startStaffJoinAction } from "../actions/staff";
import { EmailVerificationCard } from "../../components/dashboard/email-verification-card";

export const metadata: Metadata = { title: "دعوة فريق العمل | INFRO", robots: { index: false, follow: false } };
export default async function JoinTeamPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const [invite, user] = await Promise.all([readStaffInvitation(token), getCurrentUser()]);
  const button = "min-h-11 rounded-xl bg-[#07181b] px-5 py-3 text-sm font-bold text-white";
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-xl space-y-5 rounded-3xl border bg-white p-6"><h1 className="text-2xl font-black">دعوة للانضمام إلى فريق العمل</h1>{!invite ? <p>الدعوة غير صالحة، أو انتهت صلاحيتها، أو تم استخدامها. اطلب دعوة جديدة من مالك المنشأة.</p> : <><p>دعتك <b>{invite.business.name}</b> للعمل عبر INFRO.</p><p className="text-sm">البريد المدعو: <span dir="ltr">{invite.invitation.email}</span></p><ul className="list-inside list-disc space-y-2 text-sm">{invite.invitation.permissions.map(section => <li key={section}>{STAFF_SECTIONS[section].label}</li>)}</ul>{!user ? <div className="flex flex-wrap gap-3">{["login", "register"].map(mode => <form key={mode} action={startStaffJoinAction}><input type="hidden" name="token" value={token} /><input type="hidden" name="mode" value={mode} /><button className={button}>{mode === "login" ? "لدي حساب — تسجيل الدخول" : "إنشاء حساب موظف"}</button></form>)}</div> : user.email.toLowerCase() !== invite.invitation.email ? <p role="alert">الحساب الحالي لا يطابق البريد المدعو. سجّل الخروج ثم افتح الدعوة بالحساب الصحيح.</p> : !user.emailVerifiedAt ? <><p>أكد ملكية بريدك قبل الانضمام إلى المنشأة.</p><EmailVerificationCard verified={false} /><Link href={`/join-team?token=${token}`} className="inline-block underline">تحديث حالة التأكيد</Link></> : <form action={acceptStaffInvitationAction}><input type="hidden" name="token" value={token} /><button className={button}>قبول الدعوة والدخول لمساحة العمل</button></form>}</>}<Link href="/dashboard" className="block text-sm text-teal-700 underline">العودة إلى حسابي</Link></section></main>;
}
