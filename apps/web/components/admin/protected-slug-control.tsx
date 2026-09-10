import { BadgeCheck, ShieldAlert } from "lucide-react";
import { assignProtectedSlugAdminAction } from "../../app/actions/admin-protected-slug";
import { hasProtectedSlugAdminGrant } from "../../app/lib/protected-public-slug";
import { isProtectedPublicSlug } from "../../app/lib/public-url";

const RESULT_MESSAGES: Record<string, { text: string; tone: string }> = {
  assigned: { text: "تم إسناد الرابط المحمي وتسجيل مرجع التفويض في سجل التدقيق.", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  confirmation: { text: "لم تتطابق خانة التأكيد مع اسم الرابط المطلوب.", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  invalid: { text: "هذا الاسم ليس ضمن سجل العلامات المحمية القابل للاستثناء الإداري.", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  missing: { text: "المنشأة لم تعد متاحة.", tone: "border-rose-200 bg-rose-50 text-rose-800" },
  reason: { text: "أدخل مرجع تفويض واضحًا من 12 إلى 500 حرف.", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  taken: { text: "الرابط مستخدم أو محفوظ لمنشأة أخرى، ولم يُجرَ أي تغيير.", tone: "border-rose-200 bg-rose-50 text-rose-800" },
};

export async function ProtectedSlugControl({ businessId, currentSlug, result }: { businessId: string; currentSlug: string; result?: string }) {
  const protectedCurrent = isProtectedPublicSlug(currentSlug);
  const granted = protectedCurrent ? await hasProtectedSlugAdminGrant(businessId, currentSlug) : false;
  const message = result ? RESULT_MESSAGES[result] : null;

  return <article className="protected-slug-control rounded-[26px] border border-amber-200 bg-[linear-gradient(135deg,#fffaf0,#fff)] p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><ShieldAlert className="h-5 w-5" /></span>
      <div>
        <span className="text-[9px] font-black tracking-[.14em] text-amber-700" dir="ltr">PROTECTED BRAND URL</span>
        <h2 className="mt-1 font-black text-slate-950">استثناء رابط علامة محمية</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-600">الحجز الذاتي لهذه الأسماء محظور على جميع العملاء. استخدم هذا الإجراء فقط بعد التحقق من أن المنشأة تمثل العلامة أو تملك تفويضًا صالحًا؛ وسيُسجل المسؤول والمرجع والاسم السابق تدقيقيًا.</p>
      </div>
    </div>
    {protectedCurrent ? <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${granted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><BadgeCheck className="h-4 w-4" />{granted ? `الرابط الحالي ${currentSlug} مصرح به إداريًا.` : `الرابط الحالي ${currentSlug} محجوب حتى يُسجل تفويض إداري أدناه.`}</div> : null}
    {message ? <div role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${message.tone}`}>{message.text}</div> : null}
    <form action={assignProtectedSlugAdminAction} className="mt-5 grid gap-3 lg:grid-cols-2">
      <input type="hidden" name="businessId" value={businessId} />
      <label className="grid gap-2 text-xs font-bold text-slate-700">اسم الرابط المحمي
        <span className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-amber-500"><span className="text-slate-400" dir="ltr">ir.sa/</span><input name="protectedSlug" defaultValue={protectedCurrent ? currentSlug : ""} dir="ltr" autoComplete="off" required minLength={4} maxLength={60} pattern="[a-zA-Z0-9-]+" className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none" /></span>
      </label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">تأكيد اسم الرابط نفسه
        <input name="confirmationSlug" dir="ltr" autoComplete="off" required minLength={4} maxLength={60} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-amber-500" />
      </label>
      <label className="grid gap-2 text-xs font-bold text-slate-700 lg:col-span-2">مرجع التفويض أو مبرر الملكية
        <textarea name="authorizationReference" required minLength={12} maxLength={500} rows={3} placeholder="رقم الطلب، جهة التواصل، ونوع مستند التفويض بعد التحقق منه" className="rounded-xl border border-slate-200 bg-white px-3 py-3 leading-6 outline-none focus:border-amber-500" />
      </label>
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
        <p className="max-w-2xl text-[10px] leading-5 text-amber-900">هذا الإجراء يغيّر الرابط العام فورًا ويحفظ الرابط السابق كتحويل تاريخي. لا تستخدمه لطلب عميل غير موثق.</p>
        <button className="min-h-11 rounded-xl bg-[#07181b] px-5 text-xs font-black text-white">إسناد الرابط المحمي وتسجيل التفويض</button>
      </div>
    </form>
  </article>;
}
