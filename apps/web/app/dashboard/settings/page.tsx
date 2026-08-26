import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CreditCard, Download, Globe2, LifeBuoy, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { EmailVerificationCard } from "../../../components/dashboard/email-verification-card";

function supportLink() {
  return <Link href="/dashboard/support" className="font-black underline underline-offset-4">مركز الدعم</Link>;
}

function billingAlert(code: string | undefined) {
  if (!code) return null;

  if (code === "email-verification-required") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">أكد ملكية بريدك الإلكتروني قبل الانتقال إلى الدفع. لن نطلب منك سداد اشتراك مدفوع قبل ربط الحساب ببريد تملكه فعليًا.</div>;
  }
  if (code === "paid") {
    return <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-900">تم إثبات عملية الدفع وتحديث حالة الاشتراك.</div>;
  }
  if (code === "pending") {
    return <div role="status" className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold leading-7 text-blue-950"><b>عملية الدفع ما زالت قيد التحقق.</b><br />لا تعِد الدفع الآن. ستواصل HEE مطابقة حالة العملية مع مزود الدفع، ويمكنك متابعة النتيجة من إدارة الاشتراك والفوترة.</div>;
  }
  if (code === "payment-reversed") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-950"><b>لم يتم تفعيل الاشتراك المدفوع، وتم طلب عكس عملية الدفع تلقائيًا.</b><br />أثبتت بوابة الدفع العملية، لكن شروط تفعيل الاشتراك لم تعد مكتملة عند التسوية، لذلك لم تحتفظ HEE بالمبلغ مقابل اشتراك غير مفعّل. قد يستغرق ظهور الإلغاء أو الاسترداد في كشف البطاقة المدة التي يحددها البنك ومقدم الدفع. إذا بقيت العملية ظاهرة كمبلغ نهائي بعد مدة المعالجة البنكية، افتح طلبًا من {supportLink()}.</div>;
  }
  if (code === "checkout-expired") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-950"><b>انتهت صلاحية جلسة الدفع القديمة ولم يتم تفعيل الاشتراك منها.</b><br />إذا كانت بوابة الدفع قد أثبتت مبلغًا على الجلسة المنتهية، فقد طلب النظام عكسه تلقائيًا. لا تعتمد على الرابط القديم؛ ابدأ عملية دفع جديدة من صفحة إدارة الاشتراك بعد التأكد من حالة العملية السابقة.</div>;
  }
  if (code === "checkout-consent-missing") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-950"><b>لم يتم تفعيل الاشتراك لأن إثبات الموافقة على شروط الدفع لم يكن صالحًا وقت التسوية.</b><br />إذا كانت العملية قد سُددت، فقد طلب النظام عكسها تلقائيًا. ابدأ من جديد من صفحة الباقات بعد قراءة الشروط والموافقة عليها.</div>;
  }
  if (code === "rate-limited") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-950"><b>تم إيقاف التحقق مؤقتًا بسبب كثرة المحاولات.</b><br />انتظر قليلًا ولا تعِد الدفع. يمكنك الرجوع إلى سجل الفوترة ثم المحاولة لاحقًا.</div>;
  }
  if (code === "verification-unavailable") {
    return <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-950"><b>تعذر التحقق من حالة الدفع مؤقتًا.</b><br />لا تعِد الدفع حتى تتضح حالة العملية في سجل الفوترة. إذا استمر التعذر أو ظهر المبلغ نهائيًا دون تحديث الاشتراك، افتح طلبًا من {supportLink()}.</div>;
  }
  if (code === "verification-failed" || code === "invalid-callback") {
    return <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-7 text-rose-900"><b>لم نتمكن من مطابقة عملية الدفع بهذه الجلسة، ولم يتم تفعيل اشتراك منها.</b><br />راجع سجل الفوترة ولا تعِد السداد إذا كانت هناك عملية قائمة. عند وجود خصم غير واضح، تواصل عبر {supportLink()}.</div>;
  }
  if (code === "failed") {
    return <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-7 text-rose-900"><b>لم تنجح عملية الدفع ولم يتم تفعيل الاشتراك.</b><br />تحقق من سجل الفوترة قبل إعادة المحاولة. إذا ظهر مبلغ مخصوم أو معلّق رغم هذه النتيجة، لا تنشئ عملية أخرى حتى تتضح حالة العملية السابقة.</div>;
  }

  return <div role="alert" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-7 text-slate-700">تعذر عرض نتيجة الدفع بصورة كاملة. راجع سجل الفوترة، ولا تعِد الدفع إذا كانت هناك عملية قائمة. عند الحاجة تواصل عبر {supportLink()}.</div>;
}

export default async function DashboardSettingsPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  const effectivelyPublished = Boolean(business?.isPublished && user.emailVerifiedAt);
  const params = await searchParams;

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><UserRound className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">الحساب والباقات</h1><p className="mt-1 text-sm text-slate-500">بيانات حسابك وحالة اشتراكك.</p></div></div>{billingAlert(params.billing)}</section>

    <section className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><h2 className="font-black text-[#1f2552]">الحساب</h2><div className="mt-3 space-y-2"><div className="flex items-center gap-3 rounded-xl bg-[#faf9fd] p-3"><UserRound className="h-4 w-4 text-[#6543ce]" /><div className="min-w-0"><span className="block text-[10px] text-slate-400">الاسم</span><b className="block truncate text-sm text-[#252a4a]">{user.name}</b></div></div><div className="flex items-center gap-3 rounded-xl bg-[#faf9fd] p-3"><Mail className="h-4 w-4 text-[#6543ce]" /><div className="min-w-0"><span className="block text-[10px] text-slate-400">البريد الإلكتروني</span><b className="block truncate text-sm text-[#252a4a]">{user.email}</b></div></div></div><EmailVerificationCard verified={Boolean(user.emailVerifiedAt)} /></article>

      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><div className="flex items-center justify-between"><div><span className="text-[10px] font-bold text-slate-400">الباقة الحالية</span><h2 className="mt-1 text-xl font-black text-[#1f2552]">{business?.plan?.name || "Free"}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><CreditCard className="h-5 w-5" /></span></div><p className="mt-3 text-xs leading-6 text-slate-500">الباقات الأعلى ترفع حدود الفروع وفريق التواصل وتمنح أهلية طلب التوثيق. الثيمات الإضافية ستُطرح بعد اعتمادها بصريًا.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/branding" className="inline-flex min-h-10 items-center rounded-xl bg-[#5b3fd6] px-4 text-xs font-black text-white">المظهر والترقية</Link><Link href="/dashboard/billing/manage" className="inline-flex min-h-10 items-center rounded-xl border border-[#ddd8f4] bg-white px-4 text-xs font-black text-[#5d49cc]">إدارة الاشتراك والفوترة</Link></div></article>
    </section>

    {business ? <section className="grid gap-2 sm:grid-cols-3"><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><Globe2 className="h-4 w-4 text-[#6543ce]" /><span className="mt-2 block text-[10px] text-slate-400">رابط الصفحة</span><b className="mt-1 block truncate text-xs text-[#252a4a]">ir.sa/{business.slug}</b></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><ShieldCheck className={`h-4 w-4 ${effectivelyPublished ? "text-emerald-600" : "text-amber-500"}`} /><span className="mt-2 block text-[10px] text-slate-400">النشر</span><b className="mt-1 block text-xs text-[#252a4a]">{effectivelyPublished ? "منشورة" : "غير منشورة"}</b></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><BadgeCheck className={`h-4 w-4 ${business.isVerified ? "text-blue-600" : "text-slate-400"}`} /><span className="mt-2 block text-[10px] text-slate-400">التوثيق</span><b className="mt-1 block text-xs text-[#252a4a]">{business.isVerified ? "موثق" : "غير موثق"}</b></article></section> : null}

    {business ? <section className="grid gap-3 lg:grid-cols-2"><article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><div className="flex items-center gap-2"><Download className="h-4 w-4 text-[#6543ce]" /><h2 className="font-black text-[#1f2552]">بياناتك</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">نزّل نسخة JSON من بيانات حسابك ومنشأتك والمحتوى والعملاء والطلبات والحجوزات وسجل الفوترة الآمن المرتبط بالمنشأة النشطة.</p><Link href="/api/dashboard/export" prefetch={false} className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[#ddd8f4] bg-white px-4 text-xs font-black text-[#5d49cc]">تنزيل نسخة من البيانات</Link></article><article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-[#6543ce]" /><h2 className="font-black text-[#1f2552]">الدعم والخصوصية</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">للمشاكل التقنية أو الفوترة أو طلبات الخصوصية والحذف، أنشئ طلب دعم من حسابك ولا تشارك كلمات المرور أو رموز التحقق.</p><Link href="/dashboard/support" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#5b3fd6] px-4 text-xs font-black text-white">فتح مركز الدعم</Link></article></section> : null}
  </div>;
}