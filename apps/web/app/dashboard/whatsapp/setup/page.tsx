import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Link2, LockKeyhole, ShieldCheck, Radio, RefreshCw } from "lucide-react";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { getMetaEmbeddedSignupPublicConfig } from "../../../lib/whatsapp/meta-config";
import { EmbeddedSignupButton } from "./embedded-signup-button";

const connectionStatusLabel: Record<string, string> = { connected: "متصل", pending: "الربط غير مكتمل", disconnected: "غير متصل", failed: "يحتاج إعادة ربط" };

export default async function WhatsAppSetupPage() {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) redirect("/dashboard/whatsapp/inbox?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const [connection, latestSession] = await Promise.all([
    db.whatsAppConnection.findFirst({ where: { businessId: context.businessId, provider: "meta" }, select: { status: true, disabledAt: true, displayPhoneNumber: true, verifiedName: true, connectedAt: true, lastErrorCode: true } }),
    db.whatsAppEmbeddedSignupSession.findFirst({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, select: { status: true, expiresAt: true, lastErrorCode: true } }),
  ]);
  const publicConfig = getMetaEmbeddedSignupPublicConfig();
  const connected = connection?.status === "connected" && !connection.disabledAt;
  const connectionProblem = Boolean(connection && !connected);
  const recentSignupProblem = Boolean(latestSession?.lastErrorCode);

  return <div className="space-y-5 pb-4">
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#c9f8f0]/80 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><p className="flex items-center gap-1.5 text-[9px] font-black tracking-[.16em] text-[#008f87]" dir="ltr"><Radio className="h-3.5 w-3.5" />META EMBEDDED SIGNUP</p><h1 className="mt-2 text-2xl font-black">ربط رقم واتساب الرسمي</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">اربط رقم شركتك بالطريقة الرسمية عبر Meta لاستخدام المحادثات والقوالب والحملات والأتمتة. لا يعتمد الربط على QR أو WhatsApp Web.</p></div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{connected ? "متصل وجاهز" : "يتطلب ربطًا"}</span>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <article className="rounded-[26px] border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Link2 className="h-4 w-4" /></span><div><h2 className="font-black">حالة الرقم</h2><p className="text-[9px] text-slate-400">CONNECTION STATUS</p></div></div>
        {connection ? <div className="mt-5 space-y-4"><div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{connected ? "متصل وجاهز" : connection.disabledAt ? "الربط متوقف" : connectionStatusLabel[connection.status] || "يحتاج مراجعة"}</div><dl className="grid gap-3"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-400">اسم النشاط في واتساب</dt><dd className="mt-1 text-xs font-black text-slate-800">{connection.verifiedName || "لم يصل الاسم بعد"}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-400">رقم واتساب</dt><dd dir="ltr" className="mt-1 text-right text-xs font-black text-slate-800">{connection.displayPhoneNumber || "لم يصل الرقم بعد"}</dd></div>{connection.connectedAt ? <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-400">تاريخ الربط</dt><dd className="mt-1 text-xs font-black text-slate-800">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(connection.connectedAt)}</dd></div> : null}</dl>{connectionProblem ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold leading-6 text-amber-800">لن تبدأ INFRO إرسال الحملات أو الأتمتة من هذا الرقم حتى يكتمل الربط ويصبح جاهزًا.</div> : null}</div> : <div className="mt-5 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/50 p-5"><b className="text-xs">لم يتم ربط رقم بعد</b><p className="mt-2 text-[10px] leading-6 text-slate-500">ابدأ من بطاقة الربط وسجّل الدخول إلى Meta بالحساب الذي يدير رقم واتساب الخاص بالشركة.</p></div>}
      </article>

      <article className="relative overflow-hidden rounded-[26px] bg-[#07181b] p-5 text-white sm:p-6">
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[#00d8c6]/15 blur-2xl" />
        <div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#6eead8]">{connected ? <RefreshCw className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span><div><h2 className="font-black">{connected ? "تحديث الربط" : "بدء الربط الرسمي"}</h2><p className="text-[9px] text-slate-400">SECURE META AUTHORIZATION</p></div></div>
        <p className="relative mt-4 text-xs leading-7 text-slate-300">بعد موافقتك داخل Meta تتحقق INFRO من أن الرقم وحساب واتساب للأعمال تابعان للأصول التي اخترتها قبل اعتماد الربط لهذا النشاط.</p>
        <div className="relative mt-5 rounded-[18px] border border-white/10 bg-white/[.05] p-4">{publicConfig ? <EmbeddedSignupButton {...publicConfig} /> : <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-[10px] font-bold leading-6 text-amber-100"><b className="block">الربط غير متاح حاليًا</b><span className="mt-1 block font-medium text-amber-100/80">لن يتم حفظ اتصال ناقص أو محاولة إرسال أي رسالة. أعد المحاولة بعد اكتمال إعداد خدمة الربط.</span></div>}</div>
        {recentSignupProblem ? <div aria-live="polite" className="relative mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-[10px] leading-6 text-amber-100"><b className="block">لم تكتمل آخر محاولة ربط</b><span>لم نعتمد رقمًا جديدًا من هذه المحاولة. استخدم حساب Meta الذي يملك صلاحية إدارة رقم الشركة ثم أعد المحاولة.</span></div> : null}
      </article>
    </section>

    <section className="rounded-[22px] border border-slate-200 bg-white p-4"><p className="flex items-start gap-2 text-[10px] leading-6 text-slate-500"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-[#008f87]" /><span>بيانات الدخول الخاصة بالربط لا تُعرض لك أو لفريقك داخل لوحة العميل، وتستخدمها INFRO فقط لتنفيذ العمليات المصرح بها لهذا النشاط.</span></p></section>
  </div>;
}
