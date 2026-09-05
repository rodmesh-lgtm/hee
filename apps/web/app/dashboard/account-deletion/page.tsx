import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Building2, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { deleteOwnAccountAction } from "../../actions/account-deletion";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessSummaries } from "../../lib/active-business";
import { isAdminEmail } from "../../lib/admin";

// Kept for compatibility with the existing hardened deletion action.
const ACCOUNT_DELETION_CONFIRMATION = "DELETE MY HEE ACCOUNT";

export default async function AccountDeletionPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await getOwnedBusinessSummaries(user.id);
  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const adminProtected = isAdminEmail(user.email);
  const publishedCount = businesses.filter((business) => business.isPublished).length;

  const errorText = error === "email-verification-required"
    ? "يجب تأكيد ملكية البريد الإلكتروني قبل حذف الحساب."
    : error === "confirmation-mismatch"
      ? "لم تتطابق بيانات التأكيد. اكتب البريد والعبارة المطلوبة كما تظهر أدناه."
      : error === "identity-changed"
        ? "تغيرت حالة الحساب أثناء العملية. أعد تسجيل الدخول ثم حاول مرة أخرى."
        : error === "admin-protected"
          ? "حساب الإدارة المركزي محمي من الحذف الذاتي حتى لا تُفقد صلاحية إدارة المنصة."
          : error ? "تعذر تنفيذ طلب الحذف بهذه الحالة." : null;

  return <div className="space-y-5 pb-8">
    <section className="relative overflow-hidden rounded-[30px] bg-[#07181b] p-5 text-white shadow-[0_24px_70px_-44px_rgba(7,24,27,.9)] sm:p-7">
      <div className="absolute -left-14 -top-16 h-52 w-52 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-[#35e4cb]/10 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><div className="flex items-center gap-2 text-[10px] font-black tracking-[.22em] text-rose-300"><LockKeyhole className="h-4 w-4" />INFRO · PRIVACY CONTROL</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">حذف الحساب والبيانات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">منطقة حساسة ومقصودة للإغلاق النهائي. راجع الأثر على هويتك الرقمية ومنشآتك قبل تنفيذ الحذف.</p></div>
        <div className="grid grid-cols-2 gap-2 text-center"><HeroMetric label="المنشآت" value={businesses.length} /><HeroMetric label="المنشورة" value={publishedCount} /></div>
      </div>
    </section>

    {errorText ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-7 text-rose-900">{errorText}</div> : null}

    <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <article className="rounded-[26px] border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800"><AlertTriangle className="h-5 w-5" /></span><div><span className="text-[10px] font-black tracking-[.18em] text-amber-700">IMPACT REVIEW</span><h2 className="mt-1 font-black text-amber-950">ما الذي سيحدث؟</h2><ul className="mt-3 list-disc space-y-1.5 pr-5 text-xs leading-6 text-amber-950"><li>إلغاء نشر الصفحات العامة فورًا ووضع المنشآت في حالة محذوفة.</li><li>حذف جلسات الدخول وتعطيل كلمة المرور للحساب المحذوف.</li><li>إيقاف التجديد التلقائي وإبطال وسائل الدفع النشطة ومنح الوصول.</li><li>إزالة بيانات التواصل والهوية العامة غير اللازمة من ملف المنشأة.</li><li>الاحتفاظ بالسجلات المالية والتجارية والتدقيقية التي تتطلبها سياسة الاحتفاظ.</li></ul></div></div></article>
      <article className="rounded-[26px] border border-[#dce8e7] bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#008f87]" /><div><span className="text-[10px] font-black tracking-[.18em] text-[#008f87]">SAFETY GATES</span><h2 className="font-black text-[#0a2426]">الحذف ليس بنقرة واحدة</h2></div></div><div className="mt-4 space-y-2"><Gate ok={Boolean(user.emailVerifiedAt)} text="البريد الإلكتروني مؤكد" /><Gate ok={!adminProtected} text="الحساب غير محمي كإدارة مركزية" /><Gate ok text="يتطلب البريد + عبارة تأكيد حرفية" /></div></article>
    </section>

    <section className="rounded-[26px] border border-[#dce8e7] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#008f87]" /><div><span className="text-[10px] font-black tracking-[.18em] text-[#008f87]">AFFECTED IDENTITIES</span><h2 className="font-black text-[#0a2426]">المنشآت المشمولة</h2></div></div><span className="rounded-full bg-[#e9fbf7] px-3 py-1 text-[10px] font-black text-[#007a72]">{businesses.length} TOTAL</span></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{businesses.length ? businesses.map((business) => <div key={business.id} className="rounded-2xl border border-[#e3eceb] bg-[#f8fbfb] px-4 py-3"><div className="flex items-center justify-between gap-3"><b className="truncate text-sm text-[#0a2426]">{business.name}</b><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${business.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{business.isPublished ? "LIVE" : "OFFLINE"}</span></div><span className="mt-1 block truncate text-[11px] text-slate-400" dir="ltr">ir.sa/{business.slug}</span></div>) : <p className="sm:col-span-2 rounded-2xl border border-dashed border-[#dce8e7] p-6 text-center text-sm text-slate-400">لا توجد منشآت نشطة؛ سيشمل الحذف حساب المستخدم نفسه.</p>}</div>
    </section>

    <section className="overflow-hidden rounded-[28px] border border-rose-200 bg-white"><div className="border-b border-rose-100 bg-rose-50/70 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><Trash2 className="h-5 w-5" /></span><div><span className="text-[10px] font-black tracking-[.18em] text-rose-700">FINAL AUTHORIZATION</span><h2 className="mt-1 font-black text-rose-950">التأكيد النهائي</h2><p className="mt-1 text-xs leading-6 text-slate-600">لن ينفذ INFRO الحذف إلا بعد اجتياز حواجز الهوية أدناه. عبارة التأكيد التقنية الحالية ثابتة للحفاظ على توافق دورة الحذف الآمنة القائمة.</p></div></div></div>
      <div className="p-5"><code dir="ltr" className="block rounded-2xl bg-[#07181b] px-4 py-3 text-xs font-bold text-[#7ff4df]">{ACCOUNT_DELETION_CONFIRMATION}</code><form action={deleteOwnAccountAction} className="mt-4 grid gap-3 lg:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>بريد الحساب</span><input name="email" type="email" autoComplete="email" required placeholder={user.email} className="h-11 rounded-xl border border-[#dbe7e6] bg-[#fbfdfd] px-3 text-sm outline-none focus:border-[#00bfae]" /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>عبارة التأكيد</span><input name="confirmation" required autoComplete="off" aria-describedby="deletion-confirmation-help" className="h-11 rounded-xl border border-[#dbe7e6] bg-[#fbfdfd] px-3 text-sm outline-none focus:border-[#00bfae]" /></label><p id="deletion-confirmation-help" className="text-[11px] leading-5 text-slate-500 lg:col-span-2">انسخ العبارة أعلاه كما هي؛ أي اختلاف يمنع تنفيذ الحذف.</p><button disabled={!user.emailVerifiedAt || adminProtected} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-rose-700 px-5 text-sm font-black text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" />حذف الحساب نهائيًا</button></form>{!user.emailVerifiedAt ? <p className="mt-3 text-xs font-bold text-amber-700">البريد غير مؤكد. أكمل تأكيد البريد من إعدادات الحساب أولًا.</p> : null}{adminProtected ? <p className="mt-3 text-xs font-bold text-rose-700">حساب الإدارة المركزي مستثنى من الحذف الذاتي لأسباب استمرارية التشغيل.</p> : null}</div>
    </section>

    <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-xs font-black text-[#008f87] hover:text-[#006c66]"><ArrowRight className="h-4 w-4" />العودة إلى مركز الحساب</Link>
  </div>;
}

function HeroMetric({ label, value }: { label: string; value: number }) { return <div className="min-w-24 rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3"><b className="block text-xl font-black text-[#7ff4df]">{value}</b><span className="text-[9px] font-bold text-slate-400">{label}</span></div>; }
function Gate({ ok, text }: { ok: boolean; text: string }) { return <div className="flex items-center gap-2 rounded-xl bg-[#f7faf9] px-3 py-2.5 text-xs font-bold text-slate-600"><span className={`h-2 w-2 rounded-full ${ok ? "bg-[#00bfae]" : "bg-rose-500"}`} />{text}</div>; }
