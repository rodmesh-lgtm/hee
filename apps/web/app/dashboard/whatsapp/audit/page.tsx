import { redirect } from "next/navigation";
import { FileClock, ShieldCheck } from "lucide-react";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

const exactActionLabel: Record<string, string> = {
  "connection.signup.start": "بدء ربط رقم واتساب",
  "connection.signup.complete": "إكمال ربط رقم واتساب",
  "reply.enqueue": "إرسال رد إلى عميل",
  "template.sync": "تحديث القوالب من Meta",
  "campaign.create": "إنشاء حملة",
  "campaign.launch": "بدء إرسال حملة",
  "commerce.integration.register": "إضافة متجر",
  "commerce.integration.disconnect": "فصل متجر",
  "api_key.create": "إنشاء مفتاح تكامل",
  "api_key.revoke": "إلغاء مفتاح تكامل",
};
const outcomeLabel: Record<string, string> = { success: "تمت", denied: "لم يُسمح بها", failed: "تعذرت", cancelled: "أُلغيت" };
const targetLabel: Record<string, string> = {
  connection: "رقم واتساب",
  campaign: "حملة",
  automation: "أتمتة",
  template: "قالب",
  contact: "جهة اتصال",
  conversation: "محادثة",
  integration: "متجر مرتبط",
  api_key: "مفتاح تكامل",
};

function actionLabel(action: string) {
  if (exactActionLabel[action]) return exactActionLabel[action];
  if (action.startsWith("campaign.")) return "تحديث حملة";
  if (action.startsWith("automation.")) return "تحديث أتمتة";
  if (action.startsWith("contact.") || action.startsWith("contacts.")) return "تحديث جهات الاتصال";
  if (action.startsWith("template.")) return "تحديث القوالب";
  if (action.startsWith("connection.")) return "تحديث ربط واتساب";
  if (action.startsWith("commerce.")) return "تحديث ربط متجر";
  if (action.startsWith("reply.")) return "إجراء على محادثة";
  return "إجراء داخل واتساب";
}

function actorLabel(actorType: string, name: string | null | undefined) {
  if (name) return name;
  return actorType === "user" ? "أحد أعضاء الفريق" : "iR";
}

export default async function WhatsAppAuditPage() {
  const context = await getWhatsAppReadContext("audit.view");
  if (!context) redirect("/dashboard/whatsapp/inbox?access=denied");
  const logs = await db.whatsAppAuditLog.findMany({
    where: { businessId: context.businessId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, action: true, targetType: true, outcome: true, actorType: true, createdAt: true, actorUser: { select: { name: true } } },
  });
  const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);

  return <div className="space-y-4 pb-6">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><FileClock className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#20264f]">سجل نشاط واتساب</h1><p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500">راجع آخر العمليات المهمة التي نُفذت على رقم واتساب والحملات والقوالب والتكاملات لهذا النشاط. يعرض السجل آخر 100 عملية دون إظهار مفاتيح أو بيانات ربط سرية.</p></div></div></section>

    <section className="overflow-hidden rounded-[24px] border border-[#e7e9f4] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-right text-xs"><thead className="bg-[#faf9fd] text-slate-400"><tr><th className="p-3">الوقت</th><th>النشاط</th><th>بواسطة</th><th>على</th><th>النتيجة</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-[#efedf5]"><td className="p-3 text-slate-500">{date(log.createdAt)}</td><td className="font-bold text-[#252a4a]">{actionLabel(log.action)}</td><td className="text-slate-600">{actorLabel(log.actorType, log.actorUser?.name)}</td><td className="text-slate-600">{targetLabel[log.targetType] || "واتساب"}</td><td><span className={`inline-flex rounded-full px-2 py-1 font-black ${log.outcome === "success" ? "bg-emerald-50 text-emerald-700" : log.outcome === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-700"}`}>{outcomeLabel[log.outcome] || "تحتاج مراجعة"}</span></td></tr>)}{!logs.length ? <tr><td colSpan={5} className="p-10 text-center text-slate-400"><ShieldCheck className="mx-auto mb-2 h-7 w-7" /><b className="block text-sm text-[#303653]">لا يوجد نشاط مسجل بعد</b><span className="mt-1 block text-xs">عند ربط الرقم أو إدارة الحملات والقوالب ستظهر العمليات المهمة هنا تلقائيًا.</span></td></tr> : null}</tbody></table></div></section>
  </div>;
}
