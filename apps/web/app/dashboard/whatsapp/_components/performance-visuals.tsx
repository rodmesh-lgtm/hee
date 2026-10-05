import { Activity, ArrowUpRight, CheckCheck, Eye, Send, Users, CircleAlert } from "lucide-react";
import { campaignAnalytics } from "../../../lib/whatsapp/campaign-analytics";

const number = (value: number) => new Intl.NumberFormat("ar-SA").format(value);
const rate = (value: number, total: number) => total ? new Intl.NumberFormat("ar-SA", { style: "percent", maximumFractionDigits: 2 }).format(value / total) : "—";

export function PerformanceMetrics({ stats }: { stats: ReturnType<typeof campaignAnalytics> }) {
  const metrics = [
    { label: "الجمهور المثبت", value: number(stats.total), helper: "مستلم في قائمة الحملة", icon: Users },
    { label: "قبلتها Meta", value: number(stats.accepted), helper: "تشمل التسليم والقراءة", icon: Send },
    { label: "تم التسليم", value: number(stats.delivered), helper: `${rate(stats.delivered, stats.total)} من الجمهور`, icon: CheckCheck },
    { label: "تمت القراءة", value: number(stats.read), helper: `${rate(stats.read, stats.delivered)} من التسليم`, icon: Eye },
    { label: "تعذر التسليم", value: number(stats.failed), helper: `${rate(stats.failed, stats.total)} من الجمهور`, icon: CircleAlert },
  ];
  return <section aria-label="نتائج التسليم الفعلية" className="grid grid-cols-2 gap-3 lg:grid-cols-5">{metrics.map(({ label, value, helper, icon: Icon }) => <article key={label} className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-600">{label}</span><Icon className="h-4 w-4 shrink-0 text-[#008f87]" /></div><b className={`mt-4 block text-3xl font-black tabular-nums ${label === "تعذر التسليم" && stats.failed ? "text-rose-700" : "text-slate-900"}`}>{value}</b><p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p></article>)}</section>;
}

export function DeliveryDistribution({ stats }: { stats: ReturnType<typeof campaignAnalytics> }) {
  const total = stats.distribution.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * 72;
  const segments = stats.distribution.map((item, index, all) => ({ ...item, offset: all.slice(0, index).reduce((sum, part) => sum + part.value, 0) }));
  return <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-[#008f87]">حالة الجمهور الآن</p><h2 className="mt-1 text-lg font-black text-slate-900">توزيع نتائج الحملة</h2></div><Activity className="h-5 w-5 text-[#008f87]" /></div>
    <div className="mt-5 grid items-center gap-5 sm:grid-cols-[200px_1fr]">
      <div className="relative mx-auto h-[200px] w-[200px] shrink-0"><svg viewBox="0 0 200 200" role="img" aria-label="توزيع الحالات؛ الأعداد مفصلة في القائمة"><circle cx="100" cy="100" r="72" fill="none" stroke="#94a3b8" strokeOpacity=".15" strokeWidth="22" />{total > 0 ? segments.filter(item => item.value > 0).map(item => <circle key={item.label} cx="100" cy="100" r="72" fill="none" stroke={item.color} strokeWidth="22" strokeDasharray={`${item.value / total * circumference} ${circumference}`} strokeDashoffset={-item.offset / total * circumference} transform="rotate(-90 100 100)"><title>{item.label}: {number(item.value)}</title></circle>) : null}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><b className="text-3xl font-black text-slate-900">{number(stats.total)}</b><span className="mt-1 text-sm text-slate-500">مستلم</span></div></div>
      <dl className="space-y-2">{stats.distribution.map(item => <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><dt className="flex items-center gap-2 text-xs text-slate-700"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />{item.label}</dt><dd className="text-sm font-black tabular-nums text-slate-900">{number(item.value)}</dd></div>)}</dl>
    </div>
    <p className="mt-4 text-xs leading-6 text-slate-500">كل مستلم يظهر في حالة واحدة. القراءة جزء من التسليم، وليست جمهورًا إضافيًا.</p>
    {stats.mismatch ? <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">قائمة الحالات المسجلة ({number(stats.recorded)}) تختلف عن الجمهور المثبت ({number(stats.total)}). تظهر الحالات الناقصة بوضوح ولا تُحسب تسليمًا.</p> : null}
  </article>;
}

export type ActivityPoint = { label: string; accepted: number; delivered: number; read: number };
export function ActivityChart({ points, title = "إيقاع الحملة خلال 24 ساعة", helper = "قبول الإرسال والتسليم والقراءة في وقت وقوع كل حدث · توقيت الرياض" }: { points: ActivityPoint[]; title?: string; helper?: string }) {
  const max = Math.max(1, ...points.flatMap(point => [point.accepted, point.delivered, point.read]));
  const hasEvents = points.some(point => point.accepted + point.delivered + point.read > 0);
  return <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#008f87]">النشاط عبر الوقت</p><h2 className="mt-1 text-lg font-black text-slate-900">{title}</h2></div><ArrowUpRight className="h-5 w-5 text-[#008f87]" /></div><p className="mt-2 text-xs leading-6 text-slate-500">{helper}</p>
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-700">{[["قبول", "#6366f1"], ["تسليم", "#0d9488"], ["قراءة", "#0891b2"]].map(([label, color]) => <span key={label} className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>)}</div>
    {hasEvents ? <div className="mt-5 flex h-44 items-end gap-1 border-b border-slate-200" dir="ltr" aria-label={title}>{points.map((point, index) => <div key={`${point.label}-${index}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={`${point.label}: ${number(point.accepted)} قبول · ${number(point.delivered)} تسليم · ${number(point.read)} قراءة`}>{(["accepted", "delivered", "read"] as const).map((key, color) => <span key={key} className="w-1/3 rounded-t-sm" style={{ height: `${point[key] / max * 100}%`, background: ["#6366f1", "#0d9488", "#0891b2"][color] }} />)}</div>)}</div> : <div className="mt-5 grid h-44 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm leading-7 text-slate-500">لا توجد أحداث إرسال أو تسليم أو قراءة مسجلة في هذه الفترة.</div>}
    <div className="mt-2 flex justify-between text-xs text-slate-500" dir="ltr"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div>
    <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-bold">عرض الأعداد عبر الوقت</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-right text-xs"><caption className="sr-only">بيانات الرسم الزمني</caption><thead><tr>{["الوقت", "قبول", "تسليم", "قراءة"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{points.map((point, index) => <tr key={index} className="border-t border-slate-100"><td className="p-2">{point.label}</td><td>{number(point.accepted)}</td><td>{number(point.delivered)}</td><td>{number(point.read)}</td></tr>)}</tbody></table></div></details>
  </article>;
}
