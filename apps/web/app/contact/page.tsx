import Link from "next/link";
import { ArrowLeft, HelpCircle, LifeBuoy, LogIn } from "lucide-react";

export default function ContactPage() {
  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff,#fff)] px-4 py-12 text-[#1f2552]">
    <div className="mx-auto max-w-xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-2xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE<span className="h-1.5 w-1.5 rounded-full bg-[#9c6be8]" /></Link>
      <section className="mt-8 rounded-[28px] border border-[#e8e4f0] bg-white p-6 shadow-[0_28px_70px_-55px_rgba(62,35,92,.5)] sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6f3bd2]"><HelpCircle className="h-6 w-6" /></span>
        <h1 className="mt-5 text-2xl font-black">المساعدة والدعم</h1>
        <p className="mt-3 text-sm leading-8 text-slate-600">عملاء HEE يمكنهم إرسال طلب دعم موثّق من داخل الحساب ليبقى مرتبطًا بالمنشأة وتظهر حالته في مركز الدعم. تشمل الطلبات مشاكل الحساب والتقنية والباقات والفوترة والخصوصية والبيانات.</p>
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-3 text-xs font-bold leading-6 text-amber-800">لا ترسل كلمات المرور أو رموز التحقق أو بيانات بطاقات الدفع في أي طلب دعم.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Link href="/dashboard/support" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white"><LifeBuoy className="h-4 w-4" />مركز الدعم</Link><Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e3deed] px-5 text-sm font-black text-slate-600"><LogIn className="h-4 w-4" />تسجيل الدخول</Link><Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e3deed] px-5 text-sm font-black text-slate-600">الرئيسية<ArrowLeft className="h-4 w-4" /></Link></div>
      </section>
    </div>
  </main>;
}
