import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, LogOut, Clock } from "lucide-react";
import { db } from "../../../lib/db";
import { getCurrentSessionIdForUser, getCurrentUser } from "../../../lib/auth";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { revokeAccountSessionAction, revokeOtherAccountSessionsAction } from "./actions";

const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(value);
export default async function AccountSessionsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentId = await getCurrentSessionIdForUser(user.id);
  const now = new Date();
  const [sessions, total, params] = await Promise.all([
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: now } }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.session.count({ where: { userId: user.id, expiresAt: { gt: now } } }), searchParams,
  ]);
  const message = params.result === "revoked" ? "تم إنهاء الجلسات المحددة. يلزم تسجيل الدخول مجددًا لاستخدامها." : params.result === "current" ? "هذه جلستك الحالية. يمكنك الخروج منها باستخدام تسجيل الخروج." : params.result === "unchanged" ? "لا توجد جلسة متاحة لإنهائها ضمن هذا الطلب." : null;
  return <div className="min-w-0 space-y-5" dir="rtl">
    <header className="rounded-[28px] bg-[#07181b] p-6 text-white sm:p-8"><ShieldCheck className="mb-4 h-8 w-8 text-teal-300" aria-hidden="true"/><h1 className="text-2xl font-black">جلسات الدخول</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">راجع جلسات حسابك وأنهِ أي جلسة لم تعد تحتاجها. إنهاء الجلسة يمنع استخدامها في الطلب التالي، ولا يوقف اشتراك منشأتك أو مهامها التلقائية.</p><Link href="/dashboard/settings" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-500 px-4 text-sm font-bold">العودة إلى إعدادات الحساب</Link></header>
    {message ? <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-7 text-teal-900">{message}</p> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-black text-slate-900">الجلسات النشطة: {total.toLocaleString("ar-SA")}</h2><p className="mt-2 text-sm leading-7 text-slate-600">المعروض هو وقت إنشاء الجلسة وانتهائها، وليس اسم الجهاز أو موقعه.</p></div>{currentId && total > 1 ? <form action={revokeOtherAccountSessionsAction}><ConfirmSubmitButton showIcon={false} label="إنهاء جميع الجلسات الأخرى" confirmMessage="سيُطلب تسجيل الدخول مجددًا في جميع الجلسات الأخرى، وستبقى جلستك الحالية مفتوحة. متابعة؟" className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white"/></form> : null}</div></section>
    <section aria-label="قائمة جلسات الحساب" className="grid gap-3 lg:grid-cols-2">{sessions.map(session => <article key={session.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black text-slate-900">{session.id === currentId ? "هذه الجلسة" : "جلسة أخرى"}</h2><Clock className="h-5 w-5 text-teal-700" aria-hidden="true"/></div><dl className="my-4 space-y-3 text-sm"><div><dt className="text-slate-500">بدأت في</dt><dd className="mt-1 text-slate-800"><time dateTime={session.createdAt.toISOString()}>{date(session.createdAt)}</time></dd></div><div><dt className="text-slate-500">تنتهي في</dt><dd className="mt-1 text-slate-800"><time dateTime={session.expiresAt.toISOString()}>{date(session.expiresAt)}</time></dd></div></dl>{currentId && session.id !== currentId ? <form action={revokeAccountSessionAction}><input type="hidden" name="sessionId" value={session.id}/><ConfirmSubmitButton showIcon={false} label="إنهاء الجلسة" confirmMessage="هل تريد إنهاء هذه الجلسة؟ سيحتاج مستخدمها إلى تسجيل الدخول مجددًا." className="inline-flex min-h-11 items-center rounded-xl border border-rose-300 px-4 text-sm font-bold text-rose-700"/></form> : <span className="inline-flex items-center gap-2 text-sm font-bold text-teal-700"><LogOut className="h-4 w-4" aria-hidden="true"/>{session.id === currentId ? "جلستك الحالية محمية من الإنهاء هنا" : "سجّل دخولًا فعليًا لإدارة الجلسات"}</span>}</article>)}</section>
    {total > 100 ? <p className="text-sm text-slate-600">تُعرض أحدث 100 جلسة. زر إنهاء الجلسات الأخرى يشمل جميع الجلسات الأخرى.</p> : null}
  </div>;
}
