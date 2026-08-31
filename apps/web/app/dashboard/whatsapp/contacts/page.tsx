import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ContactRound, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { importWhatsAppContactsAction, retryWhatsAppContactImportAction } from "../../../actions/whatsapp-marketing";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { ImportProgressRefresh } from "./import-progress-refresh";

export default async function WhatsAppContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const [contacts, imports, contactCount, consentCount, optOutCount] = await Promise.all([
    db.whatsAppContact.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, displayName: true, phoneE164: true, email: true, source: true, optedOutAt: true, createdAt: true } }),
    db.whatsAppContactImport.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, fileName: true, status: true, totalRows: true, importedRows: true, duplicateRows: true, rejectedRows: true, createdAt: true } }),
    db.whatsAppContact.count({ where: { businessId: context.businessId } }),
    db.whatsAppConsent.count({ where: { businessId: context.businessId, revokedAt: null } }),
    db.whatsAppContact.count({ where: { businessId: context.businessId, optedOutAt: { not: null } } }),
  ]);
  const hasActiveImport = imports.some((item) => item.status === "queued" || item.status === "processing");
  return <div className="space-y-4 pb-5">
    <ImportProgressRefresh active={hasActiveImport} />
    <header className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-center gap-2"><ContactRound className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">جهات اتصال واتساب</h1></div><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">أضف جهات الاتصال التي تريد التواصل معها عبر واتساب، واستورد ملفات CSV أو Excel حتى 10,000 صف مع إزالة الأرقام المكررة تلقائيًا.</p></header>
    {params.import === "queued" ? <Notice ok text="تم قبول الملف وبدأت معالجته. ستظهر النتيجة تلقائيًا عند اكتمال الاستيراد." /> : params.import === "existing" ? <Notice ok text="هذا الملف مسجل مسبقًا لنشاطك؛ نعرض لك العملية الحالية بدل إنشاء نسخة مكررة." /> : params.import ? <Notice text="تعذر استيراد الملف. تحقق من نوع الملف وعناوين الأعمدة وأرقام الجوال، ثم حاول مرة أخرى." /> : null}
    {params.retry === "queued" ? <Notice ok text="بدأت إعادة معالجة السجلات التي تعذر استيرادها، وستظهر النتيجة تلقائيًا." /> : params.retry ? <Notice text="تعذرت إعادة المعالجة؛ قد تكون العملية ما زالت جارية أو لم تعد قابلة للإعادة." /> : null}
    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <form id="import-contacts" action={importWhatsAppContactsAction} className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-[#20264f]">استيراد ملف جهات الاتصال</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">استخدم عمودًا باسم <b>phone</b> أو <b>رقم الجوال</b>. ويمكن إضافة الاسم والبريد والوسوم اختياريًا. الحد الأقصى 5MB و10,000 صف.</p><input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-4 block w-full rounded-xl border border-dashed border-[#d9d2ec] bg-[#faf9fd] p-3 text-xs" />
        <label className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><input name="explicitConsent" type="checkbox" className="mt-1" /><span><b>تأكيد الموافقة التسويقية:</b> جميع الأرقام في الملف وافقت صراحة على استلام الرسائل التسويقية من منشأتي ويمكنني إثبات ذلك. لا تحدد هذا الخيار لمجرد أنهم عملاء أو أصحاب طلبات.</span></label><textarea name="consentEvidence" maxLength={500} rows={2} placeholder="مصدر ودليل الموافقة، مثال: نموذج اشتراك حملة رمضان بتاريخ ..." className="mt-2 w-full rounded-xl border border-[#e2deeb] px-3 py-2 text-xs" /><button className="mt-3 min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white">فحص الملف واستيراده</button>
      </form>
      <div className="space-y-3"><div className="grid grid-cols-3 gap-2"><Stat label="إجمالي الجهات" value={contactCount} /><Stat label="موافقة فعالة" value={consentCount} /><Stat label="ألغوا الاشتراك" value={optOutCount} /></div><div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-xs leading-6 text-rose-900"><ShieldAlert className="mb-2 h-5 w-5" /><b className="block">حماية موافقة المستلمين</b><span className="mt-1 block">من ألغى الاشتراك أو سحب موافقته يبقى محفوظًا في السجل، لكنه يُستبعد تلقائيًا من الحملات ولا تُضاف له رسائل جديدة.</span></div></div>
    </section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><h2 className="font-black text-[#20264f]">أحدث جهات الاتصال</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b text-slate-400"><th className="p-2">الاسم</th><th className="p-2">رقم الجوال</th><th className="p-2">المصدر</th><th className="p-2">الحالة</th><th className="p-2">أضيفت</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id} className="border-b border-[#f0edf5] last:border-0"><td className="p-2 font-bold">{contact.displayName || "—"}</td><td dir="ltr" className="p-2 text-right">{contact.phoneE164}</td><td className="p-2">{contactSourceLabel(contact.source)}</td><td className="p-2">{contact.optedOutAt ? <span className="text-rose-600">ألغى الاشتراك</span> : <span className="text-emerald-700">متاح للحملات عند وجود موافقة</span>}</td><td className="p-2 text-slate-400">{contact.createdAt.toLocaleDateString("ar-SA")}</td></tr>)}{!contacts.length ? <tr><td colSpan={5} className="p-8 text-center"><ContactRound className="mx-auto mb-3 h-6 w-6 text-slate-300" /><b className="block text-sm text-[#20264f]">لا توجد جهات اتصال بعد</b><span className="mx-auto mt-2 block max-w-md text-xs leading-6 text-slate-500">استورد ملف عملائك مع توثيق الموافقة التسويقية عند توفرها، وستظهر جهات الاتصال هنا بعد اكتمال المعالجة.</span><Link href="#import-contacts" className="mt-4 inline-flex rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">استيراد أول ملف</Link></td></tr> : null}</tbody></table></div></section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><h2 className="font-black text-[#20264f]">سجل الاستيراد</h2><div className="mt-3 grid gap-2">{imports.map((item) => {
      const handled = Math.min(item.totalRows, item.importedRows + item.duplicateRows + item.rejectedRows);
      const progress = item.totalRows ? Math.round((handled / item.totalRows) * 100) : 100;
      const active = item.status === "queued" || item.status === "processing";
      return <article key={item.id} className="rounded-2xl bg-[#faf9fd] p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{item.fileName}</b><span className="mt-1 block text-slate-400">{item.createdAt.toLocaleString("ar-SA")}</span></div><div className="flex items-center gap-2"><span className={active ? "font-bold text-amber-700" : item.status === "failed" ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>{importStatus(item.status)}</span>{item.status === "failed" ? <form action={retryWhatsAppContactImportAction}><input type="hidden" name="importId" value={item.id} /><button className="rounded-lg border border-rose-200 bg-white px-2 py-1 font-bold text-rose-700">إعادة المحاولة</button></form> : null}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9e5f2]"><div className="h-full rounded-full bg-[#6f3bd2] transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-slate-500"><span>{progress}% · {handled} من {item.totalRows}</span><span>{item.importedRows} مستورد · {item.duplicateRows} مكرر · {item.rejectedRows} مرفوض</span></div></article>;
    })}{!imports.length ? <div className="p-6 text-center"><b className="block text-sm text-[#20264f]">لا توجد عمليات استيراد بعد</b><p className="mt-2 text-xs text-slate-500">عند استيراد ملف ستظهر هنا حالة المعالجة والنتائج.</p></div> : null}</div></section>
  </div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[18px] border bg-white p-3"><span className="text-[10px] text-slate-400">{label}</span><b className="mt-1 block text-lg text-[#20264f]">{value}</b></div>; }
function Notice({ text, ok = false }: { text: string; ok?: boolean }) { return <div aria-live="polite" className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{ok ? <CheckCircle2 className="h-4 w-4" /> : null}{text}</div>; }
function importStatus(status: string) {
  if (status === "queued") return "بانتظار المعالجة";
  if (status === "processing") return "قيد الاستيراد";
  if (status === "completed") return "مكتمل";
  if (status === "completed_with_errors") return "مكتمل مع ملاحظات";
  return "تعذر الإكمال — يحتاج مراجعة";
}
function contactSourceLabel(source: string) {
  if (source === "manual_import") return "استيراد ملف";
  if (source === "manual") return "إضافة يدوية";
  if (source === "shopify") return "Shopify";
  if (source === "api") return "تكامل خارجي";
  return "مصدر آخر";
}
