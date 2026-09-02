import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3,CalendarDays,Sparkles,ArrowLeft,CheckCircle2 } from "lucide-react";
import { db } from "../../lib/db";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { updateWorkingHoursAction } from "../../actions/working-hours";

const days=["الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"];
const timeClass="h-10 rounded-xl border border-slate-200 bg-[#f8fbfb] px-2 text-sm text-slate-800 outline-none transition focus:border-[#00a99d] focus:bg-white";

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

  return <div className="space-y-4 pb-4">
    <section className="overflow-hidden rounded-[26px] border border-[#153438] bg-[#07181b] text-white"><div className="grid lg:grid-cols-[1fr_320px]"><div className="relative p-5 sm:p-6"><div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#00d8c6]/12 blur-3xl"/><div className="relative"><span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.15em] text-[#66e7d5]" dir="ltr"><Sparkles className="h-3.5 w-3.5"/>INFRO SCHEDULE STUDIO</span><h1 className="mt-3 text-2xl font-black">وقتك جزء من تجربة العميل</h1><p className="mt-2 max-w-xl text-xs leading-6 text-slate-400">اضبط الأسبوع مرة واحدة. تستخدم INFRO هذه الساعات في الصفحة العامة والتحقق من مواعيد الحجز.</p></div></div><div className="grid grid-cols-3 border-t border-white/[.08] bg-white/[.025] lg:border-r lg:border-t-0"><HeroStat label="أيام الأسبوع" value="7"/><HeroStat label="مهيأة" value={configured}/><HeroStat label="مغلقة" value={closedCount}/></div></div></section>

    {saved?<div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>تم حفظ جدول العمل.</div>:null}
    {error?<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-700">{error==="time"?"تعذر الحفظ. تأكد من إدخال وقت فتح وإغلاق صحيح لكل يوم غير مغلق.":"تعذر الحفظ. لا تجعل وقت الفتح مساويًا للإغلاق، وأكمل حقلي الفترة الثانية إن استخدمتها، وتأكد من عدم تداخل الفترتين."}</div>:null}

    <form action={updateWorkingHoursAction} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfdfd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><CalendarDays className="h-4 w-4"/></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">WEEKLY RHYTHM</span><h2 className="mt-1 text-sm font-black text-slate-950">الأسبوع التشغيلي</h2></div></div><p className="max-w-md text-[9px] leading-5 text-slate-400">الفترة الثانية اختيارية للدوام المنقسم، ويمكن أن يمتد الدوام بعد منتصف الليل دون تداخل الفترتين.</p></div>
      <div className="divide-y divide-slate-100">{days.map((day,index)=>{const row=byDay.get(index);const defaultClosed=row?.isClosed??(index===4);return <article key={day} className="grid gap-3 px-4 py-4 transition hover:bg-[#fbfefe] lg:grid-cols-[150px_1fr_1fr] lg:items-center lg:px-5"><div className="flex items-center justify-between lg:block"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${defaultClosed?"bg-slate-100 text-slate-400":"bg-[#e9fbf8] text-[#008f87]"}`}><Clock3 className="h-3.5 w-3.5"/></span><div><b className="block text-xs text-slate-900">{day}</b><span className={`mt-0.5 block text-[8px] font-black ${defaultClosed?"text-slate-400":"text-emerald-600"}`}>{defaultClosed?"CLOSED":"OPEN"}</span></div></div><label className="inline-flex items-center gap-2 text-[9px] font-bold text-slate-500 lg:mt-3"><input type="checkbox" name={`closed-${index}`} defaultChecked={defaultClosed} className="h-4 w-4 accent-[#00a99d]"/>مغلق</label></div><div className="grid grid-cols-2 gap-2"><TimeField label="يفتح" name={`opens-${index}`} value={row?.opensAt??"09:00"}/><TimeField label="يغلق" name={`closes-${index}`} value={row?.closesAt??"17:00"}/></div><div className="grid grid-cols-2 gap-2"><TimeField label="فترة ثانية من" name={`second-opens-${index}`} value={row?.secondOpensAt??""}/><TimeField label="إلى" name={`second-closes-${index}`} value={row?.secondClosesAt??""}/></div></article>})}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#fbfdfd] px-5 py-4"><Link href="/dashboard/services" className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#008f87]">العودة إلى الخدمات <ArrowLeft className="h-3 w-3"/></Link><button className="h-11 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ جدول الأسبوع</button></div>
    </form>
  </div>;
}

function TimeField({label,name,value}:{label:string;name:string;value:string}){return <label className="grid gap-1 text-[9px] font-bold text-slate-500"><span>{label}</span><input type="time" name={name} defaultValue={value} className={timeClass}/></label>}
function HeroStat({label,value}:{label:string;value:number|string}){return <div className="flex min-h-[100px] flex-col justify-center border-l border-white/[.07] px-4"><b className="text-lg text-white">{value}</b><span className="mt-1 text-[8px] font-bold text-slate-500">{label}</span></div>}
