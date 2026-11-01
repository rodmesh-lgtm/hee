import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessSummaries } from "../../lib/active-business";
import { isAdminEmail } from "../../lib/admin";
import { deactivateOwnAccountAction } from "../../actions/account-status";

export default async function AccountStatusPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await getOwnedBusinessSummaries(user.id);
  const { error } = await searchParams;
  const allowed = Boolean(user.emailVerifiedAt) && !isAdminEmail(user.email);
  return <section className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-8" dir="rtl">
    <h1 className="text-2xl font-black">تعطيل الحساب مؤقتًا</h1>
    <p className="leading-8">يحتفظ INFRO ببياناتك وفواتيرك. لاستعادة الدخول، سجّل الدخول بنفس حسابك ثم اختر إعادة التفعيل. يشمل التعطيل كل المنشآت التي تملكها، ولا يشمل منشآت الآخرين التي تعمل لديها.</p>
    <h2 className="text-lg font-bold">أثر التعطيل</h2>
    <ul className="list-disc space-y-2 pr-6 leading-7">
      <li>إنهاء جلسات دخولك وإخفاء صفحاتك وإيقاف استقبال الحجوزات والطلبات الجديدة.</li>
      <li>تعليق وصول موظفي منشآتك وإيقاف التجديد التلقائي داخل INFRO.</li>
      <li>فصل واتساب والمتاجر وإلغاء الرسائل المنتظرة وإيقاف التذكيرات وروابط البث. ستحتاج إلى إعادة الربط بعد استعادة الحساب.</li>
      <li>العمليات التي وصلت بالفعل إلى مزود خارجي قد تكتمل. لا تُلغى الحجوزات المؤكدة أو الفواتير السابقة ولا يُسترد مبلغ تلقائيًا.</li>
      <li>مدة الاشتراك المدفوعة تستمر حتى نهايتها. الاشتراكات المفوترة من سلة أو أي مزود خارجي تُدار لدى ذلك المزود أيضًا.</li>
      <li>إعادة التفعيل تعيد الدخول فقط؛ لا تعيد نشر الصفحة أو إرسال حملات قديمة أو تفعيل الموظفين والتجديد تلقائيًا.</li>
    </ul>
    <div className="rounded-2xl bg-slate-50 p-4"><h2 className="font-bold">المنشآت المشمولة ({businesses.length})</h2><ul className="mt-2 space-y-2">{businesses.map(b => <li key={b.id}>{b.name}</li>)}</ul>{!businesses.length ? <p>سيُعطّل حسابك الشخصي فقط.</p> : null}</div>
    {error ? <p role="alert" className="text-rose-800">لم يُعطّل الحساب. تأكد من بريدك وعبارة التأكيد ومن تأكيد ملكية البريد.</p> : null}
    {!allowed ? <p role="alert">يلزم بريد مؤكد، ولا يُسمح بتعطيل حساب الإدارة المركزي ذاتيًا.</p> : null}
    <form action={deactivateOwnAccountAction} className="grid gap-4">
      <label className="grid gap-2">بريد الحساب<input name="email" type="email" autoComplete="email" required className="min-h-12 rounded-xl border p-3" /></label>
      <label className="grid gap-2">اكتب عبارة التأكيد: <code dir="ltr">PAUSE MY INFRO ACCOUNT</code><input name="confirmation" autoComplete="off" required className="min-h-12 rounded-xl border p-3" /></label>
      <button disabled={!allowed} className="min-h-12 rounded-xl bg-amber-900 px-5 font-bold text-white disabled:opacity-40">تأكيد تعطيل حسابي مؤقتًا</button>
    </form>
    <div className="flex flex-wrap gap-5"><Link href="/dashboard/settings" className="underline">العودة إلى إعدادات الحساب</Link><Link href="/dashboard/account-deletion" className="text-rose-800 underline">مراجعة الحذف النهائي بدل التعطيل</Link></div>
  </section>;
}
