import { redirect } from "next/navigation";
import { CheckCircle2, Link2, LockKeyhole, ShieldCheck } from "lucide-react";
import { db } from "../../../lib/db";
import { getOwnedBusinessForRead } from "../../../lib/ownership";
import { getMetaEmbeddedSignupPublicConfig } from "../../../lib/whatsapp/meta-config";
import { EmbeddedSignupButton } from "./embedded-signup-button";

export default async function WhatsAppSetupPage() {
  const business = await getOwnedBusinessForRead();
  if (!business) redirect("/onboarding");
  const [connection, latestSession] = await Promise.all([
    db.whatsAppConnection.findFirst({ where: { businessId: business.id, provider: "meta" }, select: { status: true, wabaId: true, phoneNumberId: true, displayPhoneNumber: true, verifiedName: true, connectedAt: true, lastErrorCode: true } }),
    db.whatsAppEmbeddedSignupSession.findFirst({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, select: { status: true, expiresAt: true, lastErrorCode: true } }),
  ]);
  const publicConfig = getMetaEmbeddedSignupPublicConfig();
  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Link2 className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#20264f]">ربط WhatsApp Business</h1><p className="mt-1 text-sm leading-6 text-slate-500">يربط Embedded Signup الرسمي نشاطك بـWABA ورقم Meta الخاصين بك، دون QR أو WhatsApp Web.</p></div></div></section>
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><h2 className="font-black text-[#20264f]">حالة الاتصال</h2>{connection ? <div className="mt-4 space-y-3"><p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" />{connection.status === "active" ? "متصل وفعّال" : connection.status}</p><dl className="grid gap-2 text-sm"><div><dt className="text-xs text-slate-400">الاسم الموثق</dt><dd className="font-bold text-[#303653]">{connection.verifiedName || "—"}</dd></div><div><dt className="text-xs text-slate-400">الرقم</dt><dd dir="ltr" className="text-right font-bold text-[#303653]">{connection.displayPhoneNumber || "—"}</dd></div><div><dt className="text-xs text-slate-400">WABA / Phone ID</dt><dd dir="ltr" className="break-all text-right text-xs text-slate-500">{connection.wabaId} / {connection.phoneNumberId}</dd></div></dl></div> : <p className="mt-4 text-sm leading-7 text-slate-500">لم يُربط رقم رسمي بهذا النشاط بعد.</p>}</article>
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><h2 className="font-black text-[#20264f]">بدء الربط أو تحديثه</h2><div className="mt-3 flex gap-2 rounded-2xl bg-[#f8f7fc] p-3 text-xs leading-6 text-slate-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#6f3bd2]" /><span>لا نثق بمعرّفات WABA والرقم القادمة من المتصفح؛ الخادم يعيد التحقق من أن الرقم تابع لـWABA قبل الحفظ، ويمنع مشاركة الأصل بين نشاطين.</span></div><div className="mt-4">{publicConfig ? <EmbeddedSignupButton {...publicConfig} /> : <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">إعداد Embedded Signup غير مكتمل في هذه البيئة؛ الربط متوقف افتراضيًا.</p>}</div>{latestSession?.lastErrorCode ? <p className="mt-3 text-[11px] text-slate-400">آخر محاولة: {latestSession.status}. رمز تشغيلي: {latestSession.lastErrorCode}</p> : null}</article>
    </section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><p className="flex items-start gap-2 text-xs leading-6 text-slate-500"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>رمز الوصول لا يظهر في الواجهة أو السجلات، ويُحفظ داخل envelope مشفر مرتبط بسياق هذا النشاط وإصدار المفتاح.</span></p></section>
  </div>;
}
