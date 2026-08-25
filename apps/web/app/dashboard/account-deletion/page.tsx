import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { deleteOwnAccountAction, ACCOUNT_DELETION_CONFIRMATION } from "../../actions/account-deletion";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessSummaries } from "../../lib/active-business";
import { isAdminEmail } from "../../lib/admin";

export default async function AccountDeletionPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await getOwnedBusinessSummaries(user.id);
  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const adminProtected = isAdminEmail(user.email);

  const errorText = error === "email-verification-required"
    ? "يجب تأكيد ملكية البريد الإلكتروني قبل حذف الحساب."
    : error === "confirmation-mismatch"
      ? "لم تتطابق بيانات التأكيد. اكتب البريد والعبارة المطلوبة كما تظهر أدناه."
      : error === "identity-changed"
        ? "تغيرت حالة الحساب أثناء العملية. أعد تسجيل الدخول ثم حاول مرة أخرى."
        : error === "admin-protected"
          ? "حساب الإدارة المركزي محمي من الحذف الذاتي حتى لا تُفقد صلاحية إدارة المنصة."
          : error ? "تعذر تنفيذ طلب الحذف بهذه الحالة." : null;

  return <div className="space-y-4 pb-6">
    <section className="rounded-[24px] border border-rose-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">حذف الحساب والبيانات</h1><p className="mt-1 text-sm leading-7 text-slate-600">هذا الإجراء نهائي لحساب HEE الحالي. سيتم إلغاء نشر جميع منشآتك، إبطال جلساتك، إيقاف التجديدات، وإبطال وسائل الدفع القابلة لإعادة الاستخدام.</p></div></div>
    </section>

    {errorText ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-7 text-rose-900">{errorText}</div> : null}

    <section className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="font-black text-amber-950">ما الذي سيحدث؟</h2><ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-6 text-amber-950"><li>إلغاء نشر الصفحات العامة فورًا ووضع المنشآت في حالة محذوفة.</li><li>حذف كل جلسات الدخول وتعطيل كلمة المرور للحساب المحذوف.</li><li>إيقاف التجديد التلقائي وإبطال وسائل الدفع النشطة ومنح الوصول.</li><li>إزالة بيانات التواصل والهوية العامة غير اللازمة من ملف المنشأة.</li><li>الاحتفاظ بالسجلات المالية والتجارية والتدقيقية التي تتطلبها سياسة الاحتفاظ بدل حذفها حذفًا عشوائيًا.</li></ul></div></div>
    </section>

    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#6543ce]" /><h2 className="font-black text-[#1f2552]">المنشآت المشمولة</h2></div>
      <div className="mt-3 space-y-2">{businesses.length ? businesses.map((business) => <div key={business.id} className="rounded-xl border border-[#eeecf5] bg-[#faf9fd] px-3 py-2"><b className="block text-sm text-[#252a4a]">{business.name}</b><span className="text-[11px] text-slate-400">hee.sa/{business.slug}{business.isPublished ? " · منشورة حاليًا" : " · غير منشورة"}</span></div>) : <p className="text-sm text-slate-400">لا توجد منشآت نشطة، وسيشمل الحذف حساب المستخدم نفسه.</p>}</div>
    </section>

    <section className="rounded-[24px] border border-rose-200 bg-white p-4 sm:p-5">
      <h2 className="font-black text-rose-900">التأكيد النهائي</h2>
      <p className="mt-2 text-xs leading-6 text-slate-600">لمنع الحذف العرضي، يجب أن تكون جلستك موثقة ببريد مؤكد، ثم تكتب بريد الحساب والعبارة الإنجليزية التالية حرفيًا.</p>
      <code dir="ltr" className="mt-3 block rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">{ACCOUNT_DELETION_CONFIRMATION}</code>
      <form action={deleteOwnAccountAction} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>بريد الحساب</span><input name="email" type="email" autoComplete="email" required placeholder={user.email} className="h-11 rounded-xl border border-[#e2dfeb] px-3 text-sm" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>عبارة التأكيد</span><input name="confirmation" required autoComplete="off" className="h-11 rounded-xl border border-[#e2dfeb] px-3 text-sm" /></label>
        <button disabled={!user.emailVerifiedAt || adminProtected} className="min-h-11 w-fit rounded-xl bg-rose-700 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">حذف الحساب نهائيًا</button>
      </form>
      {!user.emailVerifiedAt ? <p className="mt-3 text-xs font-bold text-amber-700">البريد غير مؤكد. أكمل تأكيد البريد من إعدادات الحساب أولًا.</p> : null}
      {adminProtected ? <p className="mt-3 text-xs font-bold text-rose-700">حساب الإدارة المركزي مستثنى من الحذف الذاتي لأسباب استمرارية التشغيل.</p> : null}
    </section>

    <div><Link href="/dashboard/settings" className="text-xs font-black text-[#5d49cc] underline underline-offset-4">العودة إلى إعدادات الحساب</Link></div>
  </div>;
}
