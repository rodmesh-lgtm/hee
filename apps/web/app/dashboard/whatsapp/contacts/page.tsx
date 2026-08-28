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
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div><div className="flex items-center gap-2"><ContactRound className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">جهات اتصال واتساب</h1></div><p className="mt-2 text-sm text-slate-500">تطبيع E.164 وإزالة التكرار والاستيراد حتى 10,000 صف للملف الواحد.</p></div><Link href="/dashboard/whatsapp" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">مركز واتساب</Link></header>
    {params.import === "queued" ? <Notice ok text="تم فحص الملف ووضعه في طابور الاستيراد الآمن. ستتحدث النتيجة تلقائيًا دون إبقاء طلب الصفحة مفتوحًا." /> : params.import === "existing" ? <Notice ok text="هذا الملف مسجل مسبقًا لنشاطك؛ تم عرض عمليته الحالية بدل إنشاء استيراد مكرر." /> : params.import ? <Notice text="تعذر الاستيراد. تحقق من نوع الملف والعناوين والأرقام، ثم أعد المحاولة." /> : null}
    {params.retry === "queued" ? <Notice ok text="أعيدت الدفعات الفاشلة إلى الطابور، وستتحدث النتيجة تلقائيًا." /> : params.retry ? <Notice text="تعذرت إعادة تشغيل العملية؛ قد تكون قيد التنفيذ أو لم تعد قابلة للإعادة." /> : null}
    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <form action={importWhatsAppContactsAction} className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-[#20264f]">استيراد CSV / Excel</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">العنوان المطلوب: <b>phone</b> أو <b>رقم الجوال</b>. عناوين اختيارية: name، email، tags. الحد 5MB و10,000 صف.</p><input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-4 block w-full rounded-xl border border-dashed border-[#d9d2ec] bg-[#faf9fd] p-3 text-xs" />
        <label className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><input name="explicitConsent" type="checkbox" className="mt-1" /><span><b>تأكيد مستقل:</b> جميع الأرقام في الملف منحت منشأتي موافقة تسويقية صريحة قابلة للإثبات. لا تحدد هذا الخيار لمجرد أن الأرقام لعملاء أو أصحاب طلبات.</span></label><textarea name="consentEvidence" maxLength={500} rows={2} placeholder="مصدر ودليل الموافقة، مثال: نموذج اشتراك حملة رمضان بتاريخ ..." className="mt-2 w-full rounded-xl border border-[#e2deeb] px-3 py-2 text-xs" /><button className="mt-3 min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white">فحص واستيراد الملف</button>
      </form>
      <div className="space-y-3"><div className="grid grid-cols-3 gap-2"><Stat label="الإجمالي" value={contactCount} /><Stat label="موافقة فعالة" value={consentCount} /><Stat label="Opt-out" value={optOutCount} /></div><div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-xs leading-6 text-rose-900"><ShieldAlert className="mb-2 h-5 w-5" />Opt-out أو الموافقة الملغاة تمنع الإدراج في snapshot والطابور حتى لو بقي الرقم محفوظًا.</div></div>
    </section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><h2 className="font-black text-[#20264f]">أحدث جهات الاتصال</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b text-slate-400"><th className="p-2">الاسم</th><th className="p-2">الرقم E.164</th><th className="p-2">المصدر</th><th className="p-2">الحالة</th><th className="p-2">أضيفت</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id} className="border-b border-[#f0edf5] last:border-0"><td className="p-2 font-bold">{contact.displayName || "—"}</td><td dir="ltr" className="p-2 text-right">{contact.phoneE164}</td><td className="p-2">{contact.source}</td><td className="p-2">{contact.optedOutAt ? <span className="text-rose-600">Opt-out</span> : <span className="text-emerald-700">نشط</span>}</td><td className="p-2 text-slate-400">{contact.createdAt.toLocaleDateString("ar-SA")}</td></tr>)}{!contacts.length ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد جهات اتصال بعد.</td></tr> : null}</tbody></table></div></section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4"><h2 className="font-black text-[#20264f]">سجل الاستيراد</h2><div className="mt-3 grid gap-2">{imports.map((item) => {
      const handled = Math.min(item.totalRows, item.importedRows + item.duplicateRows + item.rejectedRows);
      const progress = item.totalRows ? Math.round((handled / item.totalRows) * 100) : 100;
      const active = item.status === "queued" || item.status === "processing";
      return <article key={item.id} className="rounded-2xl bg-[#faf9fd] p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{item.fileName}</b><span className="mt-1 block text-slate-400">{item.createdAt.toLocaleString("ar-SA")}</span></div><div className="flex items-center gap-2"><span className={active ? "font-bold text-amber-700" : item.status === "failed" ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>{importStatus(item.status)}</span>{item.status === "failed" ? <form action={retryWhatsAppContactImportAction}><input type="hidden" name="importId" value={item.id} /><button className="rounded-lg border border-rose-200 bg-white px-2 py-1 font-bold text-rose-700">إعادة التشغيل</button></form> : null}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9e5f2]"><div className="h-full rounded-full bg-[#6f3bd2] transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-slate-500"><span>{progress}% · {handled} من {item.totalRows}</span><span>{item.importedRows} مستورد · {item.duplicateRows} مكرر · {item.rejectedRows} مرفوض</span></div></article>;
    })}{!imports.length ? <p className="p-5 text-center text-xs text-slate-400">لا توجد عمليات استيراد.</p> : null}</div></section>
  </div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[18px] border bg-white p-3"><span className="text-[10px] text-slate-400">{label}</span><b className="mt-1 block text-lg text-[#20264f]">{value}</b></div>; }
function Notice({ text, ok = false }: { text: string; ok?: boolean }) { return <div className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{ok ? <CheckCircle2 className="h-4 w-4" /> : null}{text}</div>; }
function importStatus(status: string) {
  if (status === "queued") return "بانتظار المعالجة";
  if (status === "processing") return "قيد الاستيراد";
  if (status === "completed") return "مكتمل";
  if (status === "completed_with_errors") return "مكتمل مع ملاحظات";
  return "فشل — سيحتاج مراجعة";
}
