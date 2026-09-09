"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IrLogo } from "../../components/brand/ir-logo";
import { registerAction } from "../actions/auth";

function getPasswordCriteria(password: string) {
  return [
    { label: "8 أحرف أو أكثر", met: password.length >= 8 },
    { label: "حرف كبير", met: /[A-Z]/.test(password) },
    { label: "حرف صغير", met: /[a-z]/.test(password) },
    { label: "رقم", met: /\d/.test(password) },
    { label: "رمز خاص", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const oauthMessages: Record<string, string> = {
  "consent-required": "وافق على الشروط والأحكام وسياسة الخصوصية قبل إنشاء الحساب عبر Google أو Apple.",
  "provider-unavailable": "إنشاء الحساب عبر هذا المزود غير متاح مؤقتًا.",
  "too-many-attempts": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
  "start-unavailable": "تعذر بدء إنشاء الحساب الخارجي الآن. حاول بعد قليل.",
  "start-failed": "تعذر بدء إنشاء الحساب الخارجي. حاول مرة أخرى.",
  "authentication-failed": "تعذر التحقق من الحساب الخارجي. حاول مرة أخرى.",
  "provider-cancelled": "تم إلغاء العملية قبل إكمال إنشاء الحساب.",
};

function GoogleMark() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>; }
function AppleMark() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.79 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.1ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/></svg>; }

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, { error: "" });
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const passwordCriteria = useMemo(() => getPasswordCriteria(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormReady = name.trim().length >= 2 && email.trim().length > 4 && passwordCriteria.every((item) => item.met) && !passwordMismatch && confirmPassword.length > 0 && agreed;
  const oauthError = searchParams.get("oauth");
  const oauthMessage = oauthError ? oauthMessages[oauthError] ?? "تعذر إنشاء الحساب الخارجي. حاول مرة أخرى." : "";
  const socialHref = (provider: "google" | "apple") => agreed ? `/api/auth/oauth/${provider}?mode=register&consent=accepted` : "#social-consent";

  return <main dir="rtl" className="min-h-screen bg-[#f4f8f8] text-[#0a2426]">
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,600px)]">
      <section className="relative hidden overflow-hidden bg-[#07181b] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"><div className="absolute -right-32 -top-28 h-96 w-96 rounded-full bg-[#00e5a8]/10 blur-3xl"/><div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#00b4d8]/10 blur-3xl"/><Link href="/" className="relative w-fit" aria-label="العودة إلى INFRO"><IrLogo className="h-14 w-auto" priority /></Link><div className="relative max-w-xl"><span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[#66e7d5]" dir="ltr"><Sparkles className="h-4 w-4"/>START WITH INFRO</span><h1 className="mt-5 text-4xl font-black leading-[1.25] xl:text-5xl">ابدأ بهوية أعمال جاهزة للنمو.</h1><p className="mt-5 max-w-lg text-sm leading-8 text-slate-300">أنشئ حسابك أولًا، ثم جهّز هوية منشأتك وصفحتها وأدوات التواصل والتسويق من مساحة واحدة.</p><div className="mt-8 space-y-3"><Feature text="حساب مستقل لكل مستخدم ومنشأة"/><Feature text="إعداد تدريجي وواضح للهوية"/><Feature text="صلاحيات وحماية مدمجة من البداية"/></div></div><div className="relative flex items-center gap-2 text-[10px] font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-[#55e7d3]"/>INFRO · ir.sa</div></section>
      <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10"><div className="w-full max-w-md"><Link href="/" className="mb-6 block w-fit lg:hidden" aria-label="العودة إلى INFRO"><IrLogo className="h-12 w-auto" priority /></Link><div className="rounded-[28px] border border-[#dfe9e8] bg-white p-5 shadow-[0_28px_80px_-58px_rgba(7,24,27,.65)] sm:p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf8] text-[#008f87]"><UserPlus className="h-5 w-5" /></span><span className="mt-5 block text-[9px] font-black tracking-[.18em] text-[#008f87]" dir="ltr">CREATE YOUR WORKSPACE</span><h2 className="mt-1 text-2xl font-black">إنشاء حساب INFRO</h2><p className="mt-1 text-sm leading-6 text-slate-500">حسابك أولًا، ثم إعداد هوية أعمال منشأتك بخطوات قصيرة.</p>
        {oauthMessage ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{oauthMessage}</p> : null}
        <div className="mt-5 grid gap-3" aria-label="إنشاء الحساب عبر مزود خارجي"><Link href={socialHref("google")} prefetch={false} aria-disabled={!agreed} className={`flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 ${!agreed ? "opacity-50" : "hover:border-[#9fe8df] hover:bg-[#f7fcfb]"}`}><GoogleMark/><span>المتابعة باستخدام Google</span></Link><Link href={socialHref("apple")} prefetch={false} aria-disabled={!agreed} className={`flex h-12 items-center justify-center gap-3 rounded-2xl bg-black px-4 text-sm font-black text-white ${!agreed ? "opacity-50" : "hover:bg-[#1c1c1e]"}`}><AppleMark/><span>المتابعة باستخدام Apple</span></Link></div>
        <label id="social-consent" className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-100 bg-[#f7fbfa] p-3 text-xs leading-6 text-slate-600"><input name="socialAgreed" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-[#008f87]"/><span>أوافق على <Link href="/terms" className="font-black text-[#008f87]">الشروط والأحكام</Link> و <Link href="/privacy" className="font-black text-[#008f87]">سياسة الخصوصية</Link> لإنشاء الحساب.</span></label>
        <div className="my-5 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-slate-200"/><span className="text-xs font-bold text-slate-400">أو بالبريد الإلكتروني</span><span className="h-px flex-1 bg-slate-200"/></div>
        <form action={action} className="space-y-4" aria-label="نموذج إنشاء الحساب"><Field label="الاسم الكامل"><input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /></Field><Field label="البريد الإلكتروني"><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /></Field><Field label="كلمة المرور"><div className="relative"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 pl-12 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label={showPassword?"إخفاء كلمة المرور":"إظهار كلمة المرور"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></Field><div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#f4faf9] p-3 text-[10px]">{passwordCriteria.map((item) => <div key={item.label} className={`flex items-center gap-1.5 ${item.met ? "font-bold text-emerald-700" : "text-slate-400"}`}><span>{item.met ? "✓" : "○"}</span><span>{item.label}</span></div>)}</div><Field label="تأكيد كلمة المرور"><div className="relative"><input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 pl-12 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label={showConfirmPassword?"إخفاء تأكيد كلمة المرور":"إظهار تأكيد كلمة المرور"}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></Field>{passwordMismatch ? <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">كلمتا المرور غير متطابقتين.</p> : null}<input type="hidden" name="agreed" value={agreed ? "on" : ""}/>{state.error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}<button type="submit" disabled={pending || !isFormReady} className="h-12 w-full rounded-2xl bg-[#07181b] px-4 text-sm font-black text-white transition hover:bg-[#0d292d] focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 disabled:bg-slate-300">{pending ? "جاري إنشاء الحساب..." : "إنشاء الحساب والمتابعة"}</button></form>
        <p className="mt-5 text-center text-sm text-slate-500">لديك حساب؟ <Link href="/login" className="font-black text-[#008f87]">تسجيل الدخول</Link></p></div></div></section>
    </div>
  </main>;
}
function Feature({text}:{text:string}){return <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#55e7d3]"/>{text}</div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-sm font-black">{label}</span>{children}</label>}
