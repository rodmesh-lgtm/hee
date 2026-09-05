import Link from "next/link";
import { ArrowLeft, HelpCircle, LifeBuoy, LogIn, ShieldCheck } from "lucide-react";

export default function ContactPage() {
  return <main dir="rtl" className="min-h-screen bg-[#f4f8f8] px-4 py-12 text-[#0a2426]">
    <div className="mx-auto max-w-xl">
      <Link href="/" aria-label="العودة إلى INFRO" className="inline-flex items-center gap-2 text-2xl font-black tracking-[-.04em] text-[#07181b]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#07181b] text-xs font-black text-[#55e7d3]">iR</span><span>INFRO</span></Link>
      <section className="mt-8 rounded-[28px] border border-[#dfe9e8] bg-white p-6 shadow-[0_28px_70px_-55px_rgba(7,24,27,.45)] sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9fbf8] text-[#008f87]"><HelpCircle className="h-6 w-6" aria-hidden="true" /></span>
        <h1 className="mt-5 text-2xl font-black">المساعدة والدعم</h1>
        <p className="mt-3 text-sm leading-8 text-slate-600">عملاء INFRO يمكنهم إرسال طلب دعم موثّق من داخل الحساب ليبقى مرتبطًا بالمنشأة وتظهر حالته في مركز الدعم. تشمل الطلبات مشاكل الحساب والتقنية والباقات والفوترة والخصوصية والبيانات.</p>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-3 text-xs font-bold leading-6 text-amber-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/><span>لا ترسل كلمات المرور أو رموز التحقق أو بيانات بطاقات الدفع في أي طلب دعم.</span></p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Link href="/dashboard/support" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07181b] px-5 text-sm font-black text-white"><LifeBuoy className="h-4 w-4" aria-hidden="true" />مركز الدعم</Link><Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe9e8] px-5 text-sm font-black text-slate-600"><LogIn className="h-4 w-4" aria-hidden="true" />تسجيل الدخول</Link><Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe9e8] px-5 text-sm font-black text-slate-600">الرئيسية<ArrowLeft className="h-4 w-4" aria-hidden="true" /></Link></div>
      </section>
    </div>
  </main>;
}
