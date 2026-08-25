import { redirect } from "next/navigation";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { createSupportRequestAction } from "../../actions/support";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { db } from "../../lib/db";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function supportDateTime(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(value);
}

const categoryLabel: Record<string, string> = {
  account: "الحساب",
  billing: "الباقات والفوترة",
  technical: "مشكلة تقنية",
  privacy: "الخصوصية والبيانات",
  other: "أخرى",
};

export default async function DashboardSupportPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const params = await searchParams;
  const sent = Array.isArray(params?.sent) ? params.sent[0] : params?.sent;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const tickets = await db.analyticsEvent.findMany({
    where: { businessId: business.id, eventType: "support_requested" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, createdAt: true, metadata: true },
  });

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><LifeBuoy className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">الدعم والمساعدة</h1><p className="mt-1 text-sm text-slate-500">أرسل طلبًا من حسابك ليبقى مرتبطًا بالمنشأة ويمكن تتبع حالته ونتيجة معالجته.</p></div></div></section>

    {sent === "1" ? <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />تم استلام طلب الدعم.</div> : null}
    {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error === "rate-limited" ? "تم إرسال عدة طلبات خلال وقت قصير. حاول لاحقًا." : error === "unavailable" ? "خدمة الدعم غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل." : "تحقق من عنوان الطلب وتفاصيله."}</div> : null}

    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5">
      <h2 className="font-black text-[#1f2552]">طلب جديد</h2>
      <form action={createSupportRequestAction} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>نوع الطلب</span><select name="category" className="h-11 rounded-xl border border-[#e2dfeb] bg-white px-3 text-sm"><option value="account">الحساب</option><option value="billing">الباقات والفوترة</option><option value="technical">مشكلة تقنية</option><option value="privacy">الخصوصية والبيانات</option><option value="other">أخرى</option></select></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>العنوان</span><input name="subject" maxLength={120} required className="h-11 rounded-xl border border-[#e2dfeb] px-3 text-sm" placeholder="صف المشكلة باختصار" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>التفاصيل</span><textarea name="message" maxLength={4000} required rows={6} className="rounded-xl border border-[#e2dfeb] px-3 py-3 text-sm leading-7" placeholder="اذكر التفاصيل التي تساعدنا على فهم الطلب. لا ترسل كلمات مرور أو رموز تحقق." /></label>
        <p className="text-[11px] leading-5 text-slate-400">لا تشارك كلمة المرور أو رموز الدخول أو بيانات بطاقات الدفع في طلب الدعم.</p>
        <button className="min-h-11 w-fit rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white">إرسال الطلب</button>
      </form>
    </section>

    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5">
      <h2 className="font-black text-[#1f2552]">آخر الطلبات</h2>
      <div className="mt-4 space-y-2">{tickets.length ? tickets.map((ticket) => {
        const meta = metadataObject(ticket.metadata);
        const status = String(meta.status ?? "open");
        const category = String(meta.category ?? "other");
        const resolutionNote = String(meta.resolutionNote ?? "").trim();
        return <article key={ticket.id} className="rounded-2xl border border-[#eeecf5] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-[#252a4a]">{String(meta.subject ?? "طلب دعم")}</b><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{status === "resolved" ? "تمت المعالجة" : "مفتوح"}</span></div><div className="mt-1 flex gap-2 text-[10px] text-slate-400"><span>{categoryLabel[category] ?? categoryLabel.other}</span><span>·</span><time>{supportDateTime(ticket.createdAt)}</time></div>{status === "resolved" && resolutionNote ? <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><span className="block text-[10px] font-black text-emerald-700">نتيجة المعالجة</span><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-700">{resolutionNote}</p></div> : null}</article>;
      }) : <p className="text-sm text-slate-400">لا توجد طلبات دعم حتى الآن.</p>}</div>
    </section>
  </div>;
}
