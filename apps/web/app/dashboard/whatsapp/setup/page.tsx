import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Link2, LockKeyhole, ShieldCheck } from "lucide-react";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { getMetaEmbeddedSignupPublicConfig } from "../../../lib/whatsapp/meta-config";
import { EmbeddedSignupButton } from "./embedded-signup-button";

const connectionStatusLabel: Record<string, string> = {
  connected: "متصل",
  pending: "الربط غير مكتمل",
  disconnected: "غير متصل",
  failed: "يحتاج إعادة ربط",
};

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

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Link2 className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#20264f]">ربط رقم واتساب الرسمي</h1><p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500">اربط رقم شركتك عبر Meta لتستخدمه في المحادثات والقوالب والحملات والأتمتة داخل iR. الربط يتم بالطريقة الرسمية ولا يعتمد على مسح QR أو WhatsApp Web.</p></div></div></section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><h2 className="font-black text-[#20264f]">حالة الرقم</h2>{connection ? <div className="mt-4 space-y-3"><p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{connected ? "متصل وجاهز" : connection.disabledAt ? "الربط متوقف" : connectionStatusLabel[connection.status] || "يحتاج مراجعة"}</p><dl className="grid gap-3 text-sm"><div><dt className="text-xs text-slate-400">اسم النشاط في واتساب</dt><dd className="font-bold text-[#303653]">{connection.verifiedName || "لم يصل الاسم بعد"}</dd></div><div><dt className="text-xs text-slate-400">رقم واتساب</dt><dd dir="ltr" className="text-right font-bold text-[#303653]">{connection.displayPhoneNumber || "لم يصل الرقم بعد"}</dd></div>{connection.connectedAt ? <div><dt className="text-xs text-slate-400">تاريخ الربط</dt><dd className="font-bold text-[#303653]">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(connection.connectedAt)}</dd></div> : null}</dl>{connectionProblem ? <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">لن يبدأ iR إرسال الحملات أو الأتمتة من هذا الرقم حتى يكتمل الربط ويصبح الرقم جاهزًا. استخدم خطوة الربط في الجهة الأخرى لإعادة المحاولة بأمان.</p> : null}</div> : <div className="mt-4 rounded-2xl border border-dashed border-[#ddd9e8] bg-[#fcfbfe] p-5"><b className="text-sm text-[#303653]">لم يتم ربط رقم بعد</b><p className="mt-2 text-xs leading-6 text-slate-500">ابدأ الربط من البطاقة المجاورة وسجّل الدخول إلى Meta بالحساب الذي يدير رقم واتساب الخاص بالشركة.</p></div>}</article>

      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><h2 className="font-black text-[#20264f]">{connected ? "تحديث الربط" : "بدء الربط"}</h2><div className="mt-3 flex gap-2 rounded-2xl bg-[#f8f7fc] p-3 text-xs leading-6 text-slate-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#6f3bd2]" /><span>بعد موافقتك داخل Meta يتحقق iR من أن الرقم وحساب واتساب للأعمال تابعان للربط الذي اخترته قبل اعتمادهما لهذا النشاط.</span></div><div className="mt-4">{publicConfig ? <EmbeddedSignupButton {...publicConfig} /> : <div className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800"><b className="block">الربط غير متاح حاليًا</b><span className="mt-1 block font-medium">لن يتم حفظ اتصال ناقص أو محاولة إرسال أي رسالة. أعد المحاولة بعد اكتمال إعداد خدمة الربط في iR.</span></div>}</div>{recentSignupProblem ? <div aria-live="polite" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800"><b className="block">لم تكتمل آخر محاولة ربط</b><span>لم نعتمد رقمًا جديدًا من هذه المحاولة. تأكد من استخدام حساب Meta الذي يملك صلاحية إدارة رقم الشركة، ثم أعد المحاولة.</span></div> : null}</article>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><p className="flex items-start gap-2 text-xs leading-6 text-slate-500"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>بيانات الدخول الخاصة بالربط لا تُعرض لك أو لفريقك داخل لوحة العميل، ويستخدمها iR فقط لتنفيذ العمليات المصرح بها لهذا النشاط.</span></p></section>
  </div>;
}
