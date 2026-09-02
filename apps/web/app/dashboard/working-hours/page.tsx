import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3,CalendarDays,Sparkles,ArrowLeft,CheckCircle2,SunMedium,MoonStar } from "lucide-react";
import { db } from "../../lib/db";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { updateWorkingHoursAction } from "../../actions/working-hours";

const days=["الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"];
const timeClass="h-11 min-w-0 rounded-xl border border-slate-200 bg-[#f8fbfb] px-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10";

export default async function DashboardWorkingHoursPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const params=searchParams?await searchParams:{};
  const saved=params.saved==="1";
  const error=Array.isArray(params.error)?params.error[0]:params.error;
  const activeBusiness=await getOwnedBusinessForRead();
  if(!activeBusiness)redirect("/onboarding");
  const business=await db.business.findFirst({where:{id:activeBusiness.id,ownerId:activeBusiness.ownerId,deletedAt:null},select:{id:true,openingHours:{orderBy:{dayOfWeek:"asc"}}}});
  if(!business)redirect("/onboarding");
  const byDay=new Map(business.openingHours.map(item=>[item.dayOfWeek,item]));
  const configured=days.reduce((count,_day,index)=>byDay.has(index)?count+1:count,0);
  const closedCount=days.reduce((count,_day,index)=>(byDay.get(index)?.isClosed??(index===4))?count+1:count,0);
  const openCount=7-closedCount;

  return <div className="space-y-4 pb-24 lg:pb-4">
    <section className="overflow-hidden rounded-[28px] border border-[#153438] bg-[#07181b] text-white shadow-[0_22px_70px_-46px_rgba(7,24,27,.78)]">
      <div className="grid lg:grid-cols-[1fr_340px]">
        <div className="relative p-5 sm:p-7"><div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[#00d8c6]/12 blur-3xl"/><div className="relative"><span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.15em] text-[#66e7d5]" dir="ltr"><Sparkles className="h-3.5 w-3.5"/>INFRO SCHEDULE STUDIO</span><h1 className="mt-3 max-w-2xl text-[25px] font-black leading-tight tracking-tight sm:text-[30px]">اجعل وقت عملك واضحًا قبل أن يسأل العميل</h1><p className="mt-2 max-w-xl text-[11px] leading-6 text-slate-400 sm:text-xs">جدول واحد يغذي صفحتك العامة ومنطق الحجز. اضبط اليوم، الفترة الأساسية، والفترة الثانية فقط عندما تحتاجها.</p></div></div>
        <div className="grid grid-cols-3 border-t border-white/[.08] bg-white/[.025] lg:border-r lg:border-t-0"><HeroStat label="أيام مفتوحة" value={openCount}/><HeroStat label="مهيأة" value={configured}/><HeroStat label="مغلقة" value={closedCount}/></div>
      </div>
    </section>

    {saved?<div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>تم حفظ جدول العمل.</div>:null}
    {error?<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-700">{error==="time"?"تعذر الحفظ. تأكد من إدخال وقت فتح وإغلاق صحيح لكل يوم غير مغلق.":"تعذر الحفظ. لا تجعل وقت الفتح مساويًا للإغلاق، وأكمل حقلي الفترة الثانية إن استخدمتها، وتأكد من عدم تداخل الفترتين."}</div>:null}

    <form action={updateWorkingHoursAction} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfdfd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><CalendarDays className="h-4 w-4"/></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">WEEKLY RHYTHM</span><h2 className="mt-1 text-sm font-black text-slate-950">الأسبوع التشغيلي</h2></div></div><p className="max-w-md text-[9px] leading-5 text-slate-400">الفترة الثانية اختيارية للدوام المنقسم. لا تستخدمها إلا عند وجود توقف فعلي بين فترتين.</p></div>

      <div className="divide-y divide-slate-100 bg-[#f8fbfb]/40 p-2 sm:p-3">{days.map((day,index)=>{const row=byDay.get(index);const defaultClosed=row?.isClosed??(index===4);return <article key={day} className="my-2 rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_30px_-28px_rgba(7,24,27,.55)] sm:p-4 lg:grid lg:grid-cols-[170px_1fr_1fr] lg:items-center lg:gap-4 lg:p-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 lg:block lg:border-b-0 lg:pb-0"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${defaultClosed?"bg-slate-100 text-slate-400":"bg-[#e9fbf8] text-[#008f87]"}`}><Clock3 className="h-4 w-4"/></span><div><b className="block text-sm text-slate-900">{day}</b><span className={`mt-0.5 block text-[8px] font-black tracking-[.08em] ${defaultClosed?"text-slate-400":"text-emerald-600"}`}>{defaultClosed?"CLOSED":"OPEN"}</span></div></div><label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-[10px] font-black text-slate-600 lg:mt-3 lg:w-fit"><input type="checkbox" name={`closed-${index}`} defaultChecked={defaultClosed} className="h-4 w-4 accent-[#00a99d]"/>مغلق</label></div>
        <div className="mt-3 rounded-2xl border border-slate-100 bg-[#fbfdfd] p-3 lg:mt-0"><div className="mb-2 flex items-center gap-2 text-[9px] font-black text-slate-500"><SunMedium className="h-3.5 w-3.5 text-[#00a99d]"/>الفترة الأساسية</div><div className="grid grid-cols-2 gap-2"><TimeField label="يفتح" name={`opens-${index}`} value={row?.opensAt??"09:00"}/><TimeField label="يغلق" name={`closes-${index}`} value={row?.closesAt??"17:00"}/></div></div>
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-3 lg:mt-0"><div className="mb-2 flex items-center gap-2 text-[9px] font-black text-slate-400"><MoonStar className="h-3.5 w-3.5"/>الفترة الثانية <span className="font-medium">اختيارية</span></div><div className="grid grid-cols-2 gap-2"><TimeField label="من" name={`second-opens-${index}`} value={row?.secondOpensAt??""}/><TimeField label="إلى" name={`second-closes-${index}`} value={row?.secondClosesAt??""}/></div></div>
      </article>})}</div>

      <div className="hidden items-center justify-between gap-3 border-t border-slate-100 bg-[#fbfdfd] px-5 py-4 lg:flex"><Link href="/dashboard/services" className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#008f87]">العودة إلى الخدمات <ArrowLeft className="h-3 w-3"/></Link><button className="h-11 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ جدول الأسبوع</button></div>
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[18] border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-18px_40px_-32px_rgba(7,24,27,.55)] backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-md items-center gap-2"><Link href="/dashboard/services" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-600">الخدمات</Link><button className="h-11 flex-1 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ جدول الأسبوع</button></div></div>
    </form>
  </div>;
}

function TimeField({label,name,value}:{label:string;name:string;value:string}){return <label className="grid min-w-0 gap-1 text-[9px] font-bold text-slate-500"><span>{label}</span><input type="time" name={name} defaultValue={value} className={timeClass}/></label>}
function HeroStat({label,value}:{label:string;value:number|string}){return <div className="flex min-h-[88px] flex-col justify-center border-l border-white/[.07] px-3 sm:min-h-[104px] sm:px-4"><b className="text-lg text-white">{value}</b><span className="mt-1 text-[8px] font-bold text-slate-500">{label}</span></div>}
