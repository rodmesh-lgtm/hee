import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock3, Inbox, MessageCircleReply, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getWhatsAppCareOperations, WHATSAPP_CARE_FILTERS, type WhatsAppCareFilter } from "../../../../lib/whatsapp/care-operations";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";

type SearchParams = Promise<{ q?: string | string[]; filter?: string | string[] }>;
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const formatDate = (value: Date | null) => value ? new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(value) : "—";

const filterLabels: Record<WhatsAppCareFilter, string> = {
  all: "كل المحادثات",
  "needs-reply": "تحتاج متابعة",
  "open-window": "الرد المباشر متاح",
  "template-required": "تحتاج قالبًا",
};

export default async function WhatsAppCareOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }

  const params = await searchParams;
  const operations = await getWhatsAppCareOperations({
    businessId: context.businessId,
    query: first(params.q),
    filter: first(params.filter),
  });

  return <div className="min-w-0 space-y-5 pb-5">
    <header className="relative overflow-hidden rounded-[28px] bg-[#07181b] p-5 text-white shadow-[0_28px_80px_-52px_rgba(3,23,25,.9)] sm:p-7">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/18 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#6eead8]" dir="ltr"><Sparkles className="h-4 w-4" />CUSTOMER CARE OPERATIONS</span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">لوحة الفرز والمتابعة</h1>
          <p className="mt-2 text-xs leading-7 text-slate-300">رتّب آخر المحادثات بحسب ما يحتاج متابعة فعلية وحالة نافذة خدمة واتساب، بدون اختراع حالة «غير مقروء» أو SLA غير موجود في النظام.</p>
        </div>
        <Link href="/dashboard/whatsapp/inbox" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-4 text-xs font-black text-white transition hover:bg-white/[.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35e4cb]">فتح صندوق المحادثات<ArrowLeft className="h-4 w-4" /></Link>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Metric label="آخر المحادثات" value={operations.summary.total} helper={`حتى ${operations.limit} محادثة`} />
      <Metric label="تحتاج متابعة" value={operations.summary.needsReply} helper="آخر تفاعل وارد لم يتبعه صادر" attention />
      <Metric label="نافذة الرد مفتوحة" value={operations.summary.openWindow} helper="رد نصي مباشر متاح" good />
      <Metric label="تحتاج قالبًا" value={operations.summary.templateRequired} helper="نافذة الخدمة مغلقة" />
    </section>

    <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h2 className="font-black text-slate-950">فرز المحادثات</h2><p className="mt-1 text-[10px] leading-5 text-slate-500">«تحتاج متابعة» تعني أن آخر نشاط وارد أحدث من آخر نشاط صادر؛ لا تعني أن الرسالة غير مقروءة من موظف بعينه.</p></div>
        <form className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <label className="relative min-w-0 sm:min-w-[260px]"><span className="sr-only">بحث</span><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={operations.query} maxLength={64} placeholder="اسم العميل أو الرقم" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-xs outline-none focus:border-[#8ddfd6] focus:ring-2 focus:ring-[#00bfae]/10" /></label>
          <select name="filter" defaultValue={operations.filter} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-[#8ddfd6]">{WHATSAPP_CARE_FILTERS.map((filter) => <option key={filter} value={filter}>{filterLabels[filter]}</option>)}</select>
          <button className="min-h-11 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2">تطبيق الفرز</button>
        </form>
      </div>

      <div className="mt-4 grid gap-2">
        {operations.items.length ? operations.items.map((item) => {
          const latest = item.messages[0];
          return <article key={item.id} className="rounded-[20px] border border-slate-200 bg-[#fbfdfd] p-4 transition hover:border-[#bcebe5] hover:shadow-[0_14px_36px_-30px_rgba(7,24,27,.45)]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm text-slate-950">{item.customerDisplayName || "عميل واتساب"}</b>{item.needsReply ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">تحتاج متابعة</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-500">لا يوجد وارد أحدث</span>}</div>
                <span dir="ltr" className="mt-1 block text-right text-[10px] text-slate-400">{item.customerPhoneE164}</span>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-slate-500"><span>آخر وارد: {formatDate(item.lastInboundAt)}</span><span>آخر صادر: {formatDate(item.lastOutboundAt)}</span><span>آخر نشاط: {formatDate(item.lastMessageAt)}</span>{latest ? <span>آخر رسالة: {latest.direction === "inbound" ? "واردة" : "صادرة"}</span> : null}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {item.serviceWindow.open ? <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-[9px] font-black text-emerald-700"><Clock3 className="h-3.5 w-3.5" />رد مباشر حتى {formatDate(item.serviceWindow.closesAt)}</span> : <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-[9px] font-black text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />يلزم قالب Meta</span>}
                <Link href={`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(item.id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#07181b] px-3 text-[10px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2"><MessageCircleReply className="h-4 w-4 text-[#55e7d3]" />فتح المحادثة</Link>
              </div>
            </div>
          </article>;
        }) : <div className="rounded-[20px] border border-dashed border-slate-200 p-8 text-center"><Inbox className="mx-auto h-7 w-7 text-slate-300" /><b className="mt-3 block text-sm text-slate-900">لا توجد محادثات مطابقة</b><p className="mt-2 text-xs text-slate-500">غيّر البحث أو الفلتر. لا ننشئ حالات متابعة وهمية عندما لا تطابق البيانات الشرط المختار.</p></div>}
      </div>
    </section>

    <section className="rounded-[20px] border border-slate-200 bg-white p-4"><p className="flex items-start gap-2 text-[10px] leading-6 text-slate-500"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#008f87]" /><span>لوحة المتابعة تعرض نشاط المحادثة وحالة نافذة الخدمة فقط. لا تعرض محتوى الرسائل في لوحة الفرز، ولا تدّعي وجود تعيين موظفين أو SLA أو علامات قبل توفرها كميزات Backend حقيقية.</span></p></section>
  </div>;
}

function Metric({ label, value, helper, good = false, attention = false }: { label: string; value: number; helper: string; good?: boolean; attention?: boolean }) {
  const style = good ? "border-emerald-100 bg-emerald-50/50" : attention ? "border-amber-100 bg-amber-50/60" : "border-slate-200 bg-white";
  return <article className={`rounded-[20px] border p-4 ${style}`}><span className="text-[9px] text-slate-400">{label}</span><b className="mt-1 block text-xl font-black text-slate-950">{value}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{helper}</span></article>;
}
