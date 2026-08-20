import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { updateWorkingHoursAction } from "../../actions/working-hours";

const days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

export default async function DashboardWorkingHoursPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = searchParams ? await searchParams : {};
  const saved = params.saved === "1";
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, select: { id: true, openingHours: { orderBy: { dayOfWeek: "asc" } } } });
  if (!business) redirect("/onboarding");

  const byDay = new Map(business.openingHours.map((item) => [item.dayOfWeek, item]));

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3efff] text-[#6543ce]"><Clock3 className="h-4 w-4" /></span><div><h1 className="text-xl font-black text-[#20264f]">ساعات العمل</h1><p className="mt-1 text-sm text-slate-500">تُستخدم هذه الساعات في الصفحة العامة وفي التحقق من مواعيد الحجز.</p></div></div></section>

    {saved ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">تم حفظ ساعات العمل بنجاح.</div> : null}
    {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-700">{error === "time" ? "تعذر الحفظ. تأكد من إدخال وقت فتح وإغلاق صحيح لكل يوم غير مغلق." : "تعذر الحفظ. لا تجعل وقت الفتح مساويًا للإغلاق، وأكمل حقلي الفترة الثانية إن استخدمتها، وتأكد من عدم تداخل الفترتين."}</div> : null}

    <form action={updateWorkingHoursAction} className="space-y-2">
      {days.map((day, index) => { const row = byDay.get(index); const defaultClosed = row?.isClosed ?? (index === 4); return <article key={day} className="rounded-[20px] border border-[#e7e9f4] bg-white p-3.5 sm:p-4"><div className="grid gap-3 lg:grid-cols-[120px_110px_minmax(0,1fr)_minmax(0,1fr)] lg:items-end"><div><b className="block text-sm text-[#20264f]">{day}</b><label className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" name={`closed-${index}`} defaultChecked={defaultClosed} className="h-4 w-4 accent-[#6f3bd2]" />مغلق</label></div><div className="grid grid-cols-2 gap-2 lg:col-span-1"><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>يفتح</span><input type="time" name={`opens-${index}`} defaultValue={row?.opensAt ?? "09:00"} className="h-10 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-2 text-sm" /></label><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>يغلق</span><input type="time" name={`closes-${index}`} defaultValue={row?.closesAt ?? "17:00"} className="h-10 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-2 text-sm" /></label></div><div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>فترة ثانية من</span><input type="time" name={`second-opens-${index}`} defaultValue={row?.secondOpensAt ?? ""} className="h-10 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-2 text-sm" /></label><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>إلى</span><input type="time" name={`second-closes-${index}`} defaultValue={row?.secondClosesAt ?? ""} className="h-10 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-2 text-sm" /></label></div><p className="pb-2 text-[10px] leading-5 text-slate-400">الفترة الثانية اختيارية، ومفيدة للأنشطة ذات الدوام المنقسم. يمكن أن يمتد الدوام بعد منتصف الليل، لكن لا يجوز أن تتداخل الفترتان.</p></div></article>; })}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-[#e7e9f4] bg-white p-4"><Link href="/dashboard/services" className="text-xs font-black text-[#5d49cc]">العودة للخدمات</Link><button className="h-11 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white">حفظ ساعات العمل</button></div>
    </form>
  </div>;
}
