import Link from "next/link";
import { redirect } from "next/navigation";
import { FileClock, ShieldCheck } from "lucide-react";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

const actionLabel: Record<string, string> = {
  "connection.signup.start": "بدء ربط Meta",
  "connection.signup.complete": "إكمال ربط Meta",
  "reply.enqueue": "إضافة رد للطابور",
};
const outcomeLabel: Record<string, string> = { success: "نجح", denied: "مرفوض", failed: "فشل", cancelled: "ملغى" };

export default async function WhatsAppAuditPage() {
  const context = await getWhatsAppReadContext("audit.view");
  if (!context) redirect("/dashboard/whatsapp/inbox?access=denied");
  const logs = await db.whatsAppAuditLog.findMany({
    where: { businessId: context.businessId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, action: true, targetType: true, targetId: true, outcome: true, actorType: true, createdAt: true, actorUser: { select: { name: true } } },
  });
  const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
  return <div className="space-y-4 pb-6">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><FileClock className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#20264f]">سجل تدقيق WhatsApp</h1><p className="mt-1 text-sm text-slate-500">آخر 100 عملية حساسة لهذا النشاط فقط.</p></div></div><Link href="/dashboard/whatsapp/inbox" className="inline-flex min-h-10 items-center rounded-xl border border-[#ded9ed] px-3 text-xs font-black text-[#5d49cc]">العودة للصندوق</Link></div></section>
    <section className="overflow-hidden rounded-[24px] border border-[#e7e9f4] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-[#faf9fd] text-slate-400"><tr><th className="p-3">الوقت</th><th>العملية</th><th>المنفذ</th><th>الهدف</th><th>النتيجة</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-[#efedf5]"><td className="p-3 text-slate-500">{date(log.createdAt)}</td><td className="font-bold text-[#252a4a]">{actionLabel[log.action] || log.action}</td><td>{log.actorUser?.name || (log.actorType === "user" ? "مستخدم" : log.actorType)}</td><td><span>{log.targetType}</span>{log.targetId ? <code dir="ltr" className="mt-1 block max-w-[220px] truncate text-[9px] text-slate-400">{log.targetId}</code> : null}</td><td><span className={`inline-flex rounded-full px-2 py-1 font-black ${log.outcome === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{outcomeLabel[log.outcome] || log.outcome}</span></td></tr>)}{!logs.length ? <tr><td colSpan={5} className="p-10 text-center text-slate-400"><ShieldCheck className="mx-auto mb-2 h-7 w-7" />لا توجد عمليات مسجلة بعد.</td></tr> : null}</tbody></table></div></section>
  </div>;
}
