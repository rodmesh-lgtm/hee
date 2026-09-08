import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { CheckCircle2, ContactRound, FileSpreadsheet, Search, ShieldAlert, UploadCloud, UsersRound } from "lucide-react";
import { importWhatsAppContactsAction, retryWhatsAppContactImportAction } from "../../../actions/whatsapp-marketing";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { AudienceSegmentBuilder } from "./audience-segment-builder";
import { ImportProgressRefresh } from "./import-progress-refresh";

const buttonFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2";
const audienceFilters = ["all", "eligible", "no-consent", "opted-out"] as const;
type AudienceFilter = (typeof audienceFilters)[number];
type AudienceRow = { id: string; displayName: string | null; phoneE164: string; email: string | null; source: string; optedOutAt: Date | null; createdAt: Date; consentedAt: Date | null; revokedAt: Date | null; eligible: boolean };

export default async function WhatsAppContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const query = String(params.q ?? "").trim().slice(0, 80);
  const requestedAudience = String(params.audience ?? "all") as AudienceFilter;
  const audienceFilter: AudienceFilter = audienceFilters.includes(requestedAudience) ? requestedAudience : "all";
  const searchPattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const audiencePredicate = audienceFilter === "eligible"
    ? Prisma.sql`AND contact."optedOutAt" IS NULL AND consent."revokedAt" IS NULL AND consent."consentedAt" <= CURRENT_TIMESTAMP`
    : audienceFilter === "no-consent"
      ? Prisma.sql`AND contact."optedOutAt" IS NULL AND (consent."id" IS NULL OR consent."revokedAt" IS NOT NULL OR consent."consentedAt" > CURRENT_TIMESTAMP)`
      : audienceFilter === "opted-out"
        ? Prisma.sql`AND contact."optedOutAt" IS NOT NULL`
        : Prisma.empty;
  const searchPredicate = query
    ? Prisma.sql`AND (contact."displayName" ILIKE ${searchPattern} ESCAPE '\\' OR contact."phoneE164" ILIKE ${searchPattern} ESCAPE '\\' OR COALESCE(contact."email", '') ILIKE ${searchPattern} ESCAPE '\\')`
    : Prisma.empty;

  const [contacts, imports, audienceMetrics, segments] = await Promise.all([
    db.$queryRaw<AudienceRow[]>(Prisma.sql`
      SELECT contact."id", contact."displayName", contact."phoneE164", contact."email", contact."source", contact."optedOutAt", contact."createdAt", consent."consentedAt", consent."revokedAt",
        (contact."optedOutAt" IS NULL AND consent."revokedAt" IS NULL AND consent."consentedAt" <= CURRENT_TIMESTAMP) AS "eligible"
      FROM "WhatsAppContact" contact
      LEFT JOIN "WhatsAppConsent" consent ON consent."businessId" = contact."businessId" AND consent."phoneE164" = contact."phoneE164"
      WHERE contact."businessId" = ${context.businessId}
      ${audiencePredicate}
      ${searchPredicate}
      ORDER BY contact."createdAt" DESC
      LIMIT 100
    `),
    db.whatsAppContactImport.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, fileName: true, status: true, totalRows: true, importedRows: true, duplicateRows: true, rejectedRows: true, errorSummary: true, createdAt: true } }),
    db.$queryRaw<Array<{ total: number; eligible: number; noConsent: number; optedOut: number }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (WHERE contact."optedOutAt" IS NULL AND consent."revokedAt" IS NULL AND consent."consentedAt" <= CURRENT_TIMESTAMP)::int AS "eligible",
        COUNT(*) FILTER (WHERE contact."optedOutAt" IS NULL AND (consent."id" IS NULL OR consent."revokedAt" IS NOT NULL OR consent."consentedAt" > CURRENT_TIMESTAMP))::int AS "noConsent",
        COUNT(*) FILTER (WHERE contact."optedOutAt" IS NOT NULL)::int AS "optedOut"
      FROM "WhatsAppContact" contact
      LEFT JOIN "WhatsAppConsent" consent ON consent."businessId" = contact."businessId" AND consent."phoneE164" = contact."phoneE164"
      WHERE contact."businessId" = ${context.businessId}
    `),
    db.whatsAppSegment.findMany({ where: { businessId: context.businessId, kind: "static" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, _count: { select: { memberships: true } } } }),
  ]);
  const metrics = audienceMetrics[0] ?? { total: 0, eligible: 0, noConsent: 0, optedOut: 0 };
  const hasActiveImport = imports.some((item) => item.status === "queued" || item.status === "processing");

  return <div className="min-w-0 space-y-5 pb-5">
    <ImportProgressRefresh active={hasActiveImport} />
    <header className="relative overflow-hidden rounded-[30px] bg-[#07181b] p-5 text-white shadow-[0_30px_80px_-50px_rgba(3,23,25,.85)] sm:p-7">
      <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[#00d8c6]/20 blur-3xl"/><div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#118cff]/10 blur-3xl"/>
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><span className="text-[9px] font-black tracking-[.16em] text-[#6eead8]" dir="ltr">AUDIENCE OPERATIONS</span><div className="mt-3 flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#35e4cb]"/><h1 className="text-2xl font-black">مساحة الجمهور والموافقات</h1></div><p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">من ملف Excel إلى جمهور صالح للحملة: استيراد، تنظيف، موافقة، Opt-out وشرائح في مساحة تشغيل واحدة.</p></div><Link href="/dashboard/whatsapp/campaigns" className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-xs font-black text-white transition hover:bg-white/15 ${buttonFocus}`}>الانتقال إلى الحملات</Link></div>
    </header>

    {params.import === "queued" ? <Notice ok text="تم قبول الملف وبدأت معالجته. ستظهر النتيجة تلقائيًا عند اكتمال الاستيراد." /> : params.import === "existing" ? <Notice ok text="هذا الملف مسجل مسبقًا لنشاطك؛ نعرض لك العملية الحالية بدل إنشاء نسخة مكررة." /> : params.import ? <Notice text="تعذر استيراد الملف. تحقق من النوع والعناوين وأرقام الجوال ثم حاول مرة أخرى." /> : null}
    {params.retry === "queued" ? <Notice ok text="بدأت إعادة معالجة السجلات التي تعذر استيرادها، وستظهر النتيجة تلقائيًا." /> : params.retry ? <Notice text="تعذرت إعادة المعالجة؛ قد تكون العملية ما زالت جارية أو لم تعد قابلة للإعادة." /> : null}

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Metric label="كل الجهات" value={metrics.total} hint="داخل نشاطك"/><Metric label="مؤهل للحملة" value={metrics.eligible} hint="موافقة فعالة الآن" good/><Metric label="يحتاج موافقة" value={metrics.noConsent} hint="غير قابل للإرسال"/><Metric label="Opt-out" value={metrics.optedOut} hint="مستبعد تلقائيًا"/></section>

    <section className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
      <form id="import-contacts" action={importWhatsAppContactsAction} className="rounded-[26px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><FileSpreadsheet className="h-4 w-4"/></span><div><h2 className="font-black">استيراد جمهور جديد</h2><p className="text-[9px] text-slate-400">CSV / XLSX · حتى 10,000 صف · MAX 5MB</p></div></div><p className="mt-4 text-[10px] leading-6 text-slate-500">استخدم عمودًا باسم <b>phone</b> أو <b>رقم الجوال</b>. الاسم والبريد والوسوم اختيارية، والتكرارات تُعالج دون إنشاء جهات مزدوجة.</p><label className={`mt-4 grid cursor-pointer place-items-center rounded-[18px] border border-dashed border-[#9fded6] bg-[#f5fffd] p-6 text-center transition hover:border-[#62cfc4] ${buttonFocus}`}><UploadCloud className="h-6 w-6 text-[#008f87]"/><span className="mt-2 text-[10px] font-black text-slate-700">اختر ملف CSV أو Excel</span><input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-3 block max-w-full text-[10px] text-slate-500" /></label><label className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-6 text-amber-900"><input name="explicitConsent" type="checkbox" className="mt-1 h-4 w-4 accent-[#008f87]"/><span><b>تأكيد الموافقة التسويقية:</b> جميع الأرقام في الملف وافقت صراحة على استلام الرسائل ويمكنني إثبات ذلك. وجود علاقة عميل سابقة وحده لا يكفي.</span></label><label className="mt-3 block text-[10px] font-bold text-slate-600">دليل الموافقة <span className="font-normal text-slate-400">(موصى به عند تأكيد الموافقة)</span><textarea name="consentEvidence" maxLength={500} rows={2} placeholder="مثال: نموذج اشتراك حملة رمضان بتاريخ ..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none transition focus:border-[#8ddfd6] focus:ring-2 focus:ring-[#00bfae]/10"/></label><button type="submit" className={`mt-3 min-h-11 rounded-xl bg-[#07181b] px-5 text-xs font-black text-white transition hover:bg-[#0d2a2e] ${buttonFocus}`}>فحص الملف واستيراده</button></form>
      <div className="space-y-3"><div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4"><span className="text-[9px] font-black text-emerald-700">CAMPAIGN READY</span><b className="mt-2 block text-2xl text-slate-900">{metrics.eligible}</b><p className="mt-1 text-[10px] leading-6 text-slate-600">هذا هو الجمهور الذي يطابق الآن تقاطع Contact + Consent الفعال ولم يلغِ الاشتراك.</p></div><div className="rounded-[22px] border border-rose-100 bg-rose-50/70 p-4 text-[10px] leading-6 text-rose-900"><ShieldAlert className="mb-2 h-5 w-5"/><b className="block">الموافقة ليست مجرد رقم في قاعدة البيانات</b><span className="mt-1 block">المؤهل يُحسب بوقت PostgreSQL الحالي، ويُستبعد تلقائيًا من سحب موافقته أو فعّل Opt-out. لا تُحوّل الجهات غير المؤهلة إلى جمهور قابل للإرسال.</span></div><AudienceSegmentBuilder eligibleCount={metrics.eligible} segments={segments} result={params.segment} createdCount={params.count}/></div>
    </section>

    <section className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="font-black">دليل الجمهور</h2><p className="mt-1 text-[9px] text-slate-400">آخر 100 نتيجة مطابقة للبحث والتصفية</p></div><form className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto"><label className="relative min-w-0 sm:min-w-[260px]"><Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input name="q" defaultValue={query} maxLength={80} placeholder="اسم، رقم أو بريد" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-xs outline-none focus:border-[#8ddfd6]"/></label><select name="audience" defaultValue={audienceFilter} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-[#8ddfd6]"><option value="all">كل الجهات</option><option value="eligible">مؤهل للحملة</option><option value="no-consent">يحتاج موافقة</option><option value="opted-out">Opt-out</option></select><button className={`min-h-11 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white ${buttonFocus}`}>تطبيق</button></form></div>
      {contacts.length ? <><div className="mt-4 grid gap-2 md:hidden">{contacts.map((contact)=><ContactCard key={contact.id} contact={contact}/>)}</div><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[780px] text-right text-[10px]"><thead><tr className="border-b border-slate-100 text-slate-400"><th scope="col" className="p-2">الجهة</th><th scope="col" className="p-2">رقم الجوال</th><th scope="col" className="p-2">المصدر</th><th scope="col" className="p-2">أهلية الحملة</th><th scope="col" className="p-2">أضيفت</th></tr></thead><tbody>{contacts.map((contact)=><tr key={contact.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"><td className="p-2"><b>{contact.displayName||"—"}</b>{contact.email?<span dir="ltr" className="mt-0.5 block text-right text-[9px] text-slate-400">{contact.email}</span>:null}</td><td dir="ltr" className="p-2 text-right">{contact.phoneE164}</td><td className="p-2">{contactSourceLabel(contact.source)}</td><td className="p-2"><AudienceState contact={contact}/></td><td className="p-2 text-slate-400">{contact.createdAt.toLocaleDateString("ar-SA")}</td></tr>)}</tbody></table></div></> : <div className="p-8 text-center"><ContactRound className="mx-auto mb-3 h-6 w-6 text-slate-300"/><b className="block text-sm">لا توجد نتائج مطابقة</b><span className="mx-auto mt-2 block max-w-md text-[10px] leading-6 text-slate-500">غيّر البحث أو التصفية، أو استورد جمهورك الأول إذا لم توجد جهات اتصال بعد.</span><Link href="#import-contacts" className={`mt-4 inline-flex min-h-10 items-center rounded-xl border border-[#bdebe5] bg-[#effbf9] px-3 text-[10px] font-black text-[#008f87] ${buttonFocus}`}>استيراد ملف</Link></div>}
    </section>

    <section className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-black">سجل الاستيراد</h2><p className="mt-1 text-[9px] text-slate-400">آخر 10 عمليات · مع نتيجة التنظيف والمعالجة</p></div>{hasActiveImport?<span role="status" className="rounded-full bg-amber-50 px-3 py-1 text-[9px] font-black text-amber-700">المعالجة جارية</span>:null}</div><div className="mt-4 grid gap-2">{imports.map((item)=>{const handled=Math.min(item.totalRows,item.importedRows+item.duplicateRows+item.rejectedRows),progress=item.totalRows?Math.round(handled/item.totalRows*100):100,active=item.status==="queued"||item.status==="processing";return <article key={item.id} className="rounded-[18px] bg-slate-50/70 p-3 text-[10px]"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><b className="block break-all">{item.fileName}</b><span className="mt-1 block text-[9px] text-slate-400">{item.createdAt.toLocaleString("ar-SA")}</span></div><div className="flex items-center gap-2"><span className={active?"font-bold text-amber-700":item.status==="failed"?"font-bold text-rose-700":"font-bold text-emerald-700"}>{importStatus(item.status)}</span>{item.status==="failed"?<form action={retryWhatsAppContactImportAction}><input type="hidden" name="importId" value={item.id}/><button type="submit" className={`min-h-9 rounded-lg border border-rose-200 bg-white px-2 font-bold text-rose-700 transition hover:bg-rose-50 ${buttonFocus}`}>إعادة المحاولة</button></form>:null}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`تقدم استيراد ${item.fileName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-[#00bfae] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] text-slate-500"><span>{progress}% · {handled} من {item.totalRows}</span><span>{item.importedRows} مستورد · {item.duplicateRows} مكرر · {item.rejectedRows} مرفوض</span></div>{item.rejectedRows>0?<p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-[9px] leading-5 text-amber-800">يوجد {item.rejectedRows} صفًا لم يدخل الجمهور. أصلح الأرقام أو البيانات غير الصالحة ثم أعد الاستيراد؛ لا يتم تحويل الصفوف المرفوضة إلى جهات قابلة للإرسال.</p>:null}</article>})}{!imports.length?<div className="p-6 text-center"><b className="block text-sm">لا توجد عمليات استيراد بعد</b><p className="mt-2 text-[10px] text-slate-500">عند استيراد ملف ستظهر هنا حالة المعالجة والنتائج.</p></div>:null}</div></section>
  </div>;
}

function ContactCard({contact}:{contact:AudienceRow}){return <article className="rounded-[18px] border border-slate-200 bg-[#fbfdfd] p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-slate-900">{contact.displayName||"بدون اسم"}</b><span dir="ltr" className="mt-1 block text-right text-[11px] text-slate-500">{contact.phoneE164}</span>{contact.email?<span dir="ltr" className="mt-1 block truncate text-right text-[10px] text-slate-400">{contact.email}</span>:null}</div><AudienceState contact={contact}/></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[9px] text-slate-400"><span>{contactSourceLabel(contact.source)}</span><span>{contact.createdAt.toLocaleDateString("ar-SA")}</span></div></article>}
function AudienceState({contact}:{contact:AudienceRow}){if(contact.optedOutAt)return <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-black text-rose-700">Opt-out</span>;if(contact.eligible)return <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">مؤهل</span>;return <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">يحتاج موافقة</span>}
function Metric({label,value,hint,good=false}:{label:string;value:number;hint:string;good?:boolean}){return <div className={`rounded-[20px] border p-4 ${good?"border-emerald-100 bg-emerald-50/50":"border-slate-200 bg-white"}`}><span className="text-[9px] text-slate-400">{label}</span><b className="mt-1 block text-xl text-slate-900">{value}</b><span className="mt-1 block text-[9px] text-slate-400">{hint}</span></div>}
function Notice({text,ok=false}:{text:string;ok?:boolean}){return <div role="status" aria-live="polite" className={`flex items-center gap-2 rounded-2xl border p-3 text-[10px] font-bold ${ok?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{ok?<CheckCircle2 className="h-4 w-4"/>:null}{text}</div>}
function importStatus(status:string){if(status==="queued")return "بانتظار المعالجة";if(status==="processing")return "قيد الاستيراد";if(status==="completed")return "مكتمل";if(status==="completed_with_errors")return "مكتمل مع ملاحظات";return "تعذر الإكمال — يحتاج مراجعة"}
function contactSourceLabel(source:string){if(source==="manual_import")return "استيراد ملف";if(source==="manual")return "إضافة يدوية";if(source==="shopify")return "Shopify";if(source==="api")return "تكامل خارجي";return "مصدر آخر"}
