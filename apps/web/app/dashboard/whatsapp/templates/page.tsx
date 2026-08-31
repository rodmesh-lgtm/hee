import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { syncWhatsAppTemplatesAction } from "../../../actions/whatsapp-marketing";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

export default async function WhatsAppTemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage"); if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const [connection, templates] = await Promise.all([
    db.whatsAppConnection.findFirst({ where: { businessId: context.businessId, provider: "meta" }, select: { id: true, status: true, disabledAt: true, verifiedName: true, displayPhoneNumber: true } }),
    db.whatsAppTemplate.findMany({ where: { businessId: context.businessId, provider: "meta" }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 200, select: { id: true, name: true, language: true, category: true, status: true, providerStatus: true, qualityScore: true, rejectedReason: true, lastSyncedAt: true } }),
  ]);
  const connectionReady = connection?.status === "connected" && !connection.disabledAt;
  const approvedCount = templates.filter((x) => x.status === "approved").length;
  const pendingCount = templates.filter((x) => x.status === "pending").length;
  const rejectedCount = templates.filter((x) => x.status === "rejected").length;

  return <div className="space-y-4 pb-5">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border bg-white p-5"><div><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">قوالب رسائل واتساب</h1></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">اعرض القوالب المرتبطة برقم منشأتك وحالتها لدى Meta. القالب المعتمد فقط يمكن استخدامه في الحملات، ولا تستطيع iR تغيير قرار الاعتماد الصادر من Meta.</p></div>{connectionReady ? <form action={syncWhatsAppTemplatesAction}><input type="hidden" name="connectionId" value={connection.id} /><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white"><RefreshCw className="h-4 w-4" />تحديث القوالب</button></form> : <Link href="/dashboard/whatsapp/setup" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">ربط رقم واتساب</Link>}</header>

    {!connectionReady && connection ? <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800"><AlertTriangle className="h-4 w-4" />رقم واتساب المرتبط غير جاهز حاليًا. أعد تفعيل الاتصال أولًا ثم حدّث القوالب.</p> : null}
    {params.sync ? <p aria-live="polite" className={`rounded-2xl p-3 text-xs font-bold ${params.sync === "complete" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{params.sync === "complete" ? `تم تحديث القوالب بنجاح (${params.count ?? 0}).` : "تعذر تحديث القوالب. تحقق من اتصال الرقم ثم أعد المحاولة."}</p> : null}

    <section className="grid gap-3 sm:grid-cols-3"><Status label="معتمدة" count={approvedCount} color="emerald" /><Status label="قيد المراجعة" count={pendingCount} color="amber" /><Status label="غير معتمدة" count={rejectedCount} color="rose" /></section>

    <section className="rounded-[24px] border bg-white p-4"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-right text-xs"><thead><tr className="border-b text-slate-400"><th className="p-2">القالب</th><th className="p-2">اللغة</th><th className="p-2">النوع</th><th className="p-2">الحالة</th><th className="p-2">الجودة أو سبب الرفض</th><th className="p-2">آخر تحديث</th></tr></thead><tbody>{templates.map((template) => <tr key={template.id} className="border-b last:border-0"><td className="p-2 font-bold">{template.name}</td><td className="p-2">{languageLabel(template.language)}</td><td className="p-2">{categoryLabel(template.category)}</td><td className="p-2"><span className={`font-black ${template.status === "approved" ? "text-emerald-700" : template.status === "rejected" ? "text-rose-700" : "text-amber-700"}`}>{templateStatusLabel(template.status)}</span></td><td className="max-w-xs p-2 text-slate-500">{template.qualityScore || template.rejectedReason || "—"}</td><td className="p-2 text-slate-400">{template.lastSyncedAt.toLocaleString("ar-SA")}</td></tr>)}{!templates.length ? <tr><td colSpan={6} className="p-8 text-center"><div className="mx-auto max-w-md"><p className="font-black text-[#20264f]">ابدأ بتحديث قوالب رقمك</p><p className="mt-2 leading-6 text-slate-500">{connectionReady ? "إذا أنشأت قالبًا في Meta ولم يظهر هنا بعد، حدّث القوالب لجلب حالته الحالية." : "اربط رقم واتساب التجاري أولًا، وبعد نجاح الربط ستظهر القوالب وحالات اعتمادها هنا."}</p><div className="mt-4 flex flex-wrap justify-center gap-2">{connectionReady ? <form action={syncWhatsAppTemplatesAction}><input type="hidden" name="connectionId" value={connection!.id} /><button className="rounded-xl bg-[#6f3bd2] px-4 py-2 font-black text-white">تحديث القوالب الآن</button></form> : <Link href="/dashboard/whatsapp/setup" className="rounded-xl bg-[#6f3bd2] px-4 py-2 font-black text-white">إكمال ربط الرقم</Link>}<Link href="/dashboard/whatsapp/campaigns" className="rounded-xl border px-4 py-2 font-black text-[#5d49cc]">الانتقال إلى الحملات</Link></div></div></td></tr> : null}</tbody></table></div></section>
  </div>;
}

function Status({ label, count, color }: { label: string; count: number; color: "emerald" | "amber" | "rose" }) { const classes = color === "emerald" ? "bg-emerald-50 text-emerald-800" : color === "amber" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"; return <article className={`rounded-[20px] p-4 ${classes}`}><span className="text-xs font-bold">{label}</span><b className="mt-1 block text-2xl">{count}</b></article>; }
function templateStatusLabel(status: string) { if (status === "approved") return "معتمد"; if (status === "pending") return "قيد المراجعة"; if (status === "rejected") return "غير معتمد"; if (status === "paused") return "موقوف مؤقتًا"; if (status === "disabled") return "معطّل"; return "قيد التحديث"; }
function categoryLabel(category: string) { const normalized = category.toLowerCase(); if (normalized === "marketing") return "تسويقي"; if (normalized === "utility") return "خدمي"; if (normalized === "authentication") return "مصادقة"; return category || "—"; }
function languageLabel(language: string) { if (language === "ar" || language.startsWith("ar_")) return "العربية"; if (language === "en" || language.startsWith("en_")) return "الإنجليزية"; return language; }
