import { Prisma } from "@prisma/client";
import { Activity, BellRing, Building2, CheckCircle2, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/db";

type Summary = { total: bigint; scheduled: bigint; paused: bigint; completed: bigint; cancelled: bigint };
type DeliverySummary = { queued: bigint; processing: bigint; retrying: bigint; sent: bigint; failed: bigint; unknown: bigint };
type TenantRow = { businessId: string; businessName: string; scheduled: bigint; sent: bigint; failed: bigint; unknown: bigint; lastActivityAt: Date | null };
const ZERO = BigInt(0);

export default async function AdminSmartRemindersPage() {
  await requireAdmin();
  const [summaryRows, deliveryRows, tenants, heartbeat] = await Promise.all([
    db.$queryRaw<Summary[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "total",
        COUNT(*) FILTER (WHERE "status"='scheduled')::bigint AS "scheduled",
        COUNT(*) FILTER (WHERE "status"='paused')::bigint AS "paused",
        COUNT(*) FILTER (WHERE "status"='completed')::bigint AS "completed",
        COUNT(*) FILTER (WHERE "status"='cancelled')::bigint AS "cancelled"
      FROM "SmartReminder"
    `),
    db.$queryRaw<DeliverySummary[]>(Prisma.sql`
      SELECT COUNT(*) FILTER (WHERE "status"='queued')::bigint AS "queued",
        COUNT(*) FILTER (WHERE "status"='processing')::bigint AS "processing",
        COUNT(*) FILTER (WHERE "status"='retry_scheduled')::bigint AS "retrying",
        COUNT(*) FILTER (WHERE "status"='sent')::bigint AS "sent",
        COUNT(*) FILTER (WHERE "status"='failed')::bigint AS "failed",
        COUNT(*) FILTER (WHERE "status"='delivery_unknown')::bigint AS "unknown"
      FROM "SmartReminderDelivery"
    `),
    db.$queryRaw<TenantRow[]>(Prisma.sql`
      SELECT b."id" AS "businessId", b."name" AS "businessName",
        COUNT(DISTINCT r."id") FILTER (WHERE r."status"='scheduled')::bigint AS "scheduled",
        COUNT(d."id") FILTER (WHERE d."status"='sent')::bigint AS "sent",
        COUNT(d."id") FILTER (WHERE d."status"='failed')::bigint AS "failed",
        COUNT(d."id") FILTER (WHERE d."status"='delivery_unknown')::bigint AS "unknown",
        MAX(COALESCE(d."updatedAt", r."updatedAt")) AS "lastActivityAt"
      FROM "Business" b
      JOIN "SmartReminder" r ON r."businessId"=b."id"
      LEFT JOIN "SmartReminderDelivery" d ON d."businessId"=r."businessId" AND d."reminderId"=r."id"
      WHERE b."deletedAt" IS NULL
      GROUP BY b."id", b."name"
      ORDER BY MAX(COALESCE(d."updatedAt", r."updatedAt")) DESC NULLS LAST
      LIMIT 100
    `),
    db.whatsAppOperationsHeartbeat.findUnique({ where: { id: "whatsapp-operations" }, select: { lastStartedAt: true, lastSucceededAt: true, lastFailedAt: true, lastErrorCode: true, releaseSha: true, details: true } }),
  ]);
  const summary = summaryRows[0] ?? { total: ZERO, scheduled: ZERO, paused: ZERO, completed: ZERO, cancelled: ZERO };
  const deliveries = deliveryRows[0] ?? { queued: ZERO, processing: ZERO, retrying: ZERO, sent: ZERO, failed: ZERO, unknown: ZERO };
  const attention = Number(deliveries.failed + deliveries.unknown);

  return <div dir="rtl" className="space-y-6">
    <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white shadow-sm"><div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#00d8c6]/15 blur-3xl"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><BellRing className="h-4 w-4"/>INFRO REMINDER OPERATIONS</div><h1 className="text-2xl font-black sm:text-3xl">تشغيل التذكيرات الذكية</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">مؤشرات تشغيلية للطوابير والتسليم والمنشآت فقط، دون عرض نصوص التذكيرات أو أرقام المستلمين.</p></div><Link href="/admin/whatsapp" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-[#a8f2e8]">العودة لمركز واتساب</Link></div></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<BellRing/>} label="إجمالي التذكيرات" value={Number(summary.total)}/><Metric icon={<Clock3/>} label="نشطة / متوقفة" value={Number(summary.scheduled + summary.paused)}/><Metric icon={<CheckCircle2/>} label="إرسالات ناجحة" value={Number(deliveries.sent)}/><Metric icon={<TriangleAlert/>} label="تحتاج مراجعة" value={attention} danger={attention>0}/></section>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#009d93]"/><h2 className="text-sm font-black text-slate-900">طابور الإرسال</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><Small label="بانتظار" value={Number(deliveries.queued)}/><Small label="قيد الإرسال" value={Number(deliveries.processing)}/><Small label="إعادة محاولة" value={Number(deliveries.retrying)}/><Small label="مرسل" value={Number(deliveries.sent)}/><Small label="فشل مؤكد" value={Number(deliveries.failed)} danger={Number(deliveries.failed)>0}/><Small label="نتيجة غير مؤكدة" value={Number(deliveries.unknown)} danger={Number(deliveries.unknown)>0}/></div></article><article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#009d93]"/><h2 className="text-sm font-black text-slate-900">عامل التشغيل المشترك</h2></div><div className="mt-4 space-y-2 text-xs text-slate-500"><p>آخر بدء: <b className="text-slate-800">{heartbeat?.lastStartedAt?.toLocaleString("ar-SA") ?? "—"}</b></p><p>آخر نجاح: <b className="text-slate-800">{heartbeat?.lastSucceededAt?.toLocaleString("ar-SA") ?? "—"}</b></p><p>آخر فشل: <b className="text-slate-800">{heartbeat?.lastFailedAt?.toLocaleString("ar-SA") ?? "—"}</b></p><p dir="ltr" className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-[10px]">{heartbeat?.releaseSha?.slice(0,12) ?? "no-release"}{heartbeat?.lastErrorCode ? ` · ${heartbeat.lastErrorCode}` : ""}</p></div></article></section>

    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">المنشآت التي تستخدم التذكيرات</h2><p className="mt-1 text-[10px] text-slate-400">إحصاءات تشغيلية فقط — لا يظهر محتوى التذكير أو رقم المستلم.</p></div><Building2 className="h-4 w-4 text-[#009d93]"/></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-slate-50/70 text-[10px] font-black text-slate-400"><tr><th className="p-4">المنشأة</th><th>قادمة</th><th>مرسلة</th><th>فاشلة</th><th>غير مؤكدة</th><th className="pl-4">آخر نشاط</th></tr></thead><tbody>{tenants.map((row)=><tr key={row.businessId} className="border-t border-slate-100"><td className="p-4 font-black text-slate-900">{row.businessName}</td><td>{Number(row.scheduled).toLocaleString("ar-SA")}</td><td className="text-emerald-700">{Number(row.sent).toLocaleString("ar-SA")}</td><td className={Number(row.failed)>0?"font-black text-rose-700":""}>{Number(row.failed).toLocaleString("ar-SA")}</td><td className={Number(row.unknown)>0?"font-black text-amber-700":""}>{Number(row.unknown).toLocaleString("ar-SA")}</td><td className="pl-4 text-slate-500">{row.lastActivityAt?.toLocaleString("ar-SA") ?? "—"}</td></tr>)}{!tenants.length?<tr><td colSpan={6} className="p-12 text-center text-slate-400">لا توجد تذكيرات حتى الآن.</td></tr>:null}</tbody></table></div></section>
  </div>;
}

function Metric({icon,label,value,danger=false}:{icon:React.ReactNode;label:string;value:number;danger?:boolean}){return <article className={`rounded-[20px] border bg-white p-4 shadow-sm ${danger?"border-rose-200":"border-slate-200"}`}><div className="flex items-start justify-between"><div><span className={`text-[10px] font-bold ${danger?"text-rose-500":"text-slate-400"}`}>{label}</span><b className={`mt-1 block text-2xl font-black ${danger?"text-rose-700":"text-slate-950"}`}>{value.toLocaleString("ar-SA")}</b></div><div className={`grid h-9 w-9 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4 ${danger?"bg-rose-50 text-rose-600":"bg-[#e9fbf8] text-[#009d93]"}`}>{icon}</div></div></article>}
function Small({label,value,danger=false}:{label:string;value:number;danger?:boolean}){return <div className={`rounded-2xl border p-3 ${danger?"border-rose-200 bg-rose-50":"border-slate-100 bg-slate-50"}`}><span className={`text-[10px] font-bold ${danger?"text-rose-600":"text-slate-400"}`}>{label}</span><b className={`mt-1 block text-xl font-black ${danger?"text-rose-800":"text-slate-900"}`}>{value.toLocaleString("ar-SA")}</b></div>}
