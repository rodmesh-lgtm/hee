import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { verifyEmailAction } from "../actions/email-verification";

export const metadata: Metadata = {
  title: "تأكيد البريد الإلكتروني | INFRO",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string; status?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token = "", status = "" } = await searchParams;
  const validTokenShape = /^[0-9a-f]{64}$/i.test(token);
  const message = status === "invalid"
    ? "رابط التأكيد غير صالح أو انتهت صلاحيته أو تم استخدامه من قبل."
    : status === "rate-limited"
      ? "تمت محاولات كثيرة. حاول مرة أخرى بعد قليل."
      : status === "unavailable"
        ? "تعذر التحقق من الرابط الآن. حاول مرة أخرى بعد قليل."
        : "";

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#f3fbf9,#fff_50%,#f4f8f8)] px-4 py-8 text-[#0a2426]">
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
      <section className="w-full rounded-[28px] border border-[#dce8e7] bg-white p-5 shadow-[0_24px_70px_-52px_rgba(7,24,27,.28)] sm:p-6">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf7] text-[#007f78]"><MailCheck className="h-5 w-5" /></span>
        <div className="mt-4 text-[10px] font-black tracking-[.2em] text-[#008f87]" dir="ltr">INFRO ACCOUNT SECURITY</div>
        <h1 className="mt-2 text-2xl font-black">تأكيد البريد الإلكتروني</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">نطلب هذه الخطوة قبل نشر صفحة المنشأة وحتى لا تُمنح صلاحيات حساسة قبل إثبات ملكية البريد.</p>

        {message ? <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold leading-6 text-rose-700">{message}</p> : null}
        {validTokenShape && !message ? <>
          <p role="status" className="mt-5 rounded-2xl border border-[#bdece4] bg-[#effbf9] px-3 py-3 text-sm font-bold leading-6 text-[#006c66]">تم التحقق من شكل الرابط، لكن البريد لم يُفعّل بعد. اضغط الزر التالي لإكمال التحقق بشكل آمن.</p>
          <form action={verifyEmailAction} className="mt-3">
            <input type="hidden" name="token" value={token} />
            <button className="h-12 w-full rounded-2xl bg-[#07181b] px-4 text-sm font-black text-[#7ff4df] transition hover:bg-[#0d292d]">تأكيد ملكية البريد</button>
          </form>
        </> : null}
        {!validTokenShape && !message ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold leading-6 text-amber-800">افتح رابط التأكيد الذي أرسلناه إلى بريد حسابك.</p> : null}

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/settings" className="font-black text-[#007f78]">الحساب والإعدادات</Link>
          <Link href="/login" className="font-bold text-slate-500">تسجيل الدخول</Link>
        </div>
      </section>
    </div>
  </main>;
}
