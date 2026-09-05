import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays,Eye,FileText,Globe2,MapPin,MessageCircle,Phone,Share2,ShoppingBag,TrendingUp,Sparkles,ArrowLeft,Activity,Target,MousePointerClick } from "lucide-react";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { getPlanEntitlements } from "../../lib/plan-entitlements";
import { AnalyticsVisitsChart } from "@/components/dashboard/analytics-visits-chart";

const PERIOD_OPTIONS=[7,30,90] as const;
type Period=(typeof PERIOD_OPTIONS)[number];
type AggregateRow={eventType:string;day:string;count:number|bigint};
function number(v:number){return new Intl.NumberFormat("ar-SA").format(v)}
function requestedPeriod(v?:string|string[]):Period{const raw=Array.isArray(v)?v[0]:v,p=Number(raw);return PERIOD_OPTIONS.includes(p as Period)?p as Period:30}
function periodLabel(p:Period){return p===7?"7 أيام":p===90?"90 يوم":"30 يوم"}
function riyadhDateKey(date=new Date()){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date),value=(t:string)=>parts.find(p=>p.type===t)?.value??"";return `${value("year")}-${value("month")}-${value("day")}`}
function shiftDateKey(k:string,d:number){const b=new Date(`${k}T00:00:00Z`);b.setUTCDate(b.getUTCDate()+d);return b.toISOString().slice(0,10)}
function riyadhMidnightUtc(k:string){return new Date(`${k}T00:00:00+03:00`)}
function chartLabel(k:string){return new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",day:"numeric",month:"short"}).format(new Date(`${k}T12:00:00+03:00`))}

export default async function DashboardAnalyticsPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const user=await getCurrentUser();
  if(!user)redirect("/login");
  const params=searchParams?await searchParams:{};
  const business=await getActiveBusinessWithPlanForUser(user.id);
  if(!business)redirect("/onboarding");
  const entitlements=getPlanEntitlements(business.plan?.code);
  const advancedAnalytics=entitlements.analytics==="advanced";
  const allowedPeriods:readonly Period[]=advancedAnalytics?PERIOD_OPTIONS:[7];
  const requested=requestedPeriod(params.period);
  const period:Period=allowedPeriods.includes(requested)?requested:advancedAnalytics?30:7;
  const effectivelyPublished=Boolean(business.isPublished&&user.emailVerifiedAt);
  const now=new Date(),todayKey=riyadhDateKey(now),startKey=shiftDateKey(todayKey,-(period-1)),startUtc=riyadhMidnightUtc(startKey);
  const[rows,orderConversions,bookingConversions]=await Promise.all([
    db.$queryRaw<AggregateRow[]>`SELECT "eventType",to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date,'YYYY-MM-DD') AS "day",COUNT(*)::int AS "count" FROM "AnalyticsEvent" WHERE "businessId"=${business.id} AND "createdAt">=${startUtc} AND "createdAt"<${now} AND "eventType" IN ('page_view','whatsapp_click','phone_click','share_click','website_click','map_click','company_profile_click','social_click') GROUP BY "eventType",(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date ORDER BY (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date ASC`,
    db.order.count({where:{businessId:business.id,createdAt:{gte:startUtc,lt:now}}}),
    db.booking.count({where:{businessId:business.id,createdAt:{gte:startUtc,lt:now}}}),
  ]);
  const totals=new Map<string,number>(),viewsByDay=new Map<string,number>();
  for(const row of rows){const value=Number(row.count)||0;totals.set(row.eventType,(totals.get(row.eventType)??0)+value);if(row.eventType==="page_view")viewsByDay.set(row.day,value)}
  const count=(t:string)=>totals.get(t)??0;
  const views=count("page_view"),whatsapp=count("whatsapp_click"),calls=count("phone_click"),shares=count("share_click"),maps=count("map_click"),website=count("website_click"),profileOpens=count("company_profile_click"),socialClicks=count("social_click");
  const interactions=whatsapp+calls+shares+maps+website+profileOpens+socialClicks,conversions=orderConversions+bookingConversions;
  const interactionRate=views?Math.round(interactions/views*100):0,conversionRate=views?Math.round(conversions/views*100):0;
  const chartData=Array.from({length:period},(_,i)=>{const dayKey=shiftDateKey(startKey,i);return{dayKey,label:chartLabel(dayKey),value:viewsByDay.get(dayKey)??0}});
  const metrics=[
    {label:"مشاهدات الصفحة",value:views,icon:Eye,detail:"الوصول إلى الهوية"},
    {label:"تفاعلات واتساب",value:whatsapp,icon:MessageCircle,detail:"نية تواصل مباشرة"},
    {label:"المكالمات",value:calls,icon:Phone,detail:"ضغط على رقم الاتصال"},
    {label:"المشاركة",value:shares,icon:Share2,detail:"مشاركة الصفحة"},
    {label:"الطلبات",value:orderConversions,icon:ShoppingBag,detail:"تحويل تجاري"},
    {label:"الحجوزات",value:bookingConversions,icon:CalendarDays,detail:"تحويل لحجز"},
  ];
  const bestAction=[{label:"واتساب",value:whatsapp},{label:"اتصال",value:calls},{label:"مشاركة",value:shares},{label:"موقع",value:maps},{label:"ويب",value:website},{label:"ملف الشركة",value:profileOpens},{label:"حسابات رسمية",value:socialClicks}].sort((a,b)=>b.value-a.value)[0];

  return <div className="space-y-4 pb-4 sm:space-y-5">
    <section className="relative overflow-hidden rounded-[28px] border border-[#17383b] bg-[#07181b] text-white shadow-[0_26px_72px_-44px_rgba(7,24,27,.7)]">
      <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#00d8c6]/15 blur-3xl"/>
      <div className="grid xl:grid-cols-[1fr_380px]">
        <div className="relative p-5 sm:p-7"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.05] px-2.5 py-1 text-[8px] font-black tracking-[.16em] text-[#72efdd]" dir="ltr"><TrendingUp className="h-3.5 w-3.5"/>INFRO PERFORMANCE SIGNAL</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${effectivelyPublished?"bg-emerald-300/12 text-emerald-200":"bg-amber-300/12 text-amber-200"}`}>{effectivelyPublished?"TRACKING LIVE":"TRACKING PAUSED"}</span></div><h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">افهم ما الذي يحرك عملاءك</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400 sm:text-sm">من الزيارة الأولى إلى واتساب أو اتصال أو طلب. ركّز على الإشارات التي تساعدك على اتخاذ قرار، لا على الأرقام وحدها.</p><div className="mt-5 flex flex-wrap gap-2">{allowedPeriods.map(o=><Link key={o} href={`/dashboard/analytics?period=${o}`} className={`inline-flex min-h-10 items-center rounded-xl border px-3 text-[10px] font-black ${period===o?"border-[#35e4cb]/30 bg-[#35e4cb] text-[#07181b]":"border-white/10 bg-white/[.04] text-slate-300 hover:bg-white/[.07]"}`}>{periodLabel(o)}</Link>)}</div></div>
        <div className="grid grid-cols-2 border-t border-white/[.08] bg-white/[.025] xl:border-r xl:border-t-0"><HeroStat label="الزيارات" value={number(views)} icon={<Eye className="h-4 w-4"/>}/><HeroStat label="التفاعلات" value={number(interactions)} icon={<MousePointerClick className="h-4 w-4"/>}/><HeroStat label="معدل التفاعل" value={`${interactionRate}%`} icon={<Activity className="h-4 w-4"/>}/><HeroStat label="معدل التحويل" value={`${conversionRate}%`} icon={<Target className="h-4 w-4"/>}/></div>
      </div>
    </section>

    {!advancedAnalytics?<div className="flex flex-col gap-3 rounded-[18px] border border-[#bdebe5] bg-[#effbf9] p-4 text-xs font-bold text-[#276e69] sm:flex-row sm:items-center sm:justify-between"><span>الباقة الحالية تعرض آخر 7 أيام. الباقات المؤهلة تفتح تحليلات 30 و90 يومًا.</span><Link href="/dashboard/settings" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-white px-3 text-[10px] font-black text-[#008f87] shadow-sm">عرض الباقات <ArrowLeft className="h-3 w-3"/></Link></div>:null}
    {!effectivelyPublished?<div role="status" className="flex flex-col gap-3 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>{business.isPublished&&!user.emailVerifiedAt?"أكد بريد حسابك لإتاحة الصفحة وبدء تسجيل زيارات العملاء.":"انشر صفحتك أولاً لبدء تسجيل زيارات العملاء."}</span><Link href={business.isPublished&&!user.emailVerifiedAt?"/dashboard/settings":"/dashboard/my-page"} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-[10px] font-black shadow-sm">{business.isPublished&&!user.emailVerifiedAt?"تأكيد البريد":"إعداد الصفحة"}</Link></div>:null}

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(({label,value,icon:Icon,detail})=><article key={label} className="group rounded-[20px] border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#bdebe5] hover:shadow-[0_14px_34px_-28px_rgba(7,24,27,.5)] sm:p-4"><div className="flex items-start justify-between gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Icon className="h-4 w-4"/></span><span className="text-[8px] font-black text-slate-300">{period}D</span></div><b className="mt-3 block text-xl tracking-tight text-slate-950 sm:text-2xl">{number(value)}</b><span className="mt-1 block text-[10px] font-black text-slate-600">{label}</span><span className="mt-1 hidden text-[8px] text-slate-400 sm:block">{detail}</span></article>)}</section>

    <div className="grid gap-4 xl:grid-cols-[1.5fr_.5fr]">
      <section className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><span className="text-[8px] font-black tracking-[.15em] text-[#008f87]" dir="ltr">VISIT MOMENTUM</span><h2 className="mt-1 text-sm font-black text-slate-950 sm:text-base">اتجاه الزيارات</h2><p className="mt-1 text-[10px] text-slate-400">التغير اليومي خلال {periodLabel(period)}</p></div><span className="rounded-full bg-[#e9fbf8] px-3 py-1.5 text-[10px] font-black text-[#008f87]">{number(views)} زيارة</span></div><div className="mt-4"><AnalyticsVisitsChart points={chartData}/></div>{effectivelyPublished&&views===0?<div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-[10px] leading-5 text-slate-500"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#00a99d]"/>لم تُسجل زيارات خلال هذه الفترة بعد. شارك رابط صفحتك ثم ارجع لمتابعة التفاعل.</div>:null}</section>
      <section className="relative overflow-hidden rounded-[26px] bg-[#0a2225] p-5 text-white"><div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[#00d8c6]/14 blur-3xl"/><div className="relative"><span className="text-[8px] font-black tracking-[.15em] text-[#6eead8]" dir="ltr">BEHAVIOR SNAPSHOT</span><h2 className="mt-2 text-base font-black">أفضل إشارة حالية</h2><div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.04] p-4"><span className="text-[9px] text-slate-400">أكثر تفاعل</span><b className="mt-1 block text-2xl text-[#6eead8]">{bestAction?.label??"—"}</b><span className="mt-1 block text-[10px] text-slate-400">{number(bestAction?.value??0)} مرة</span></div><div className="mt-4 grid grid-cols-2 gap-2"><MiniDark label="تفاعل" value={`${interactionRate}%`}/><MiniDark label="تحويل" value={`${conversionRate}%`}/></div></div></section>
    </div>

    <section className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[8px] font-black tracking-[.15em] text-[#008f87]" dir="ltr">IDENTITY ENGAGEMENT</span><h2 className="mt-1 text-sm font-black text-slate-950">كيف ينتقل الزائر بعد الصفحة؟</h2><p className="mt-1 text-[10px] leading-5 text-slate-400">قياس الانتقال إلى أصول الشركة وقنواتها الرسمية.</p></div><Globe2 className="h-5 w-5 text-[#008f87]"/></div><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4"><SignalCard icon={<FileText className="h-4 w-4"/>} label="ملف الشركة" value={profileOpens}/><SignalCard icon={<Globe2 className="h-4 w-4"/>} label="الحسابات الرسمية" value={socialClicks}/><SignalCard icon={<MapPin className="h-4 w-4"/>} label="الموقع" value={maps}/><SignalCard icon={<Globe2 className="h-4 w-4"/>} label="الموقع الإلكتروني" value={website}/></div></section>
  </div>;
}

function HeroStat({label,value,icon}:{label:string;value:string;icon:ReactNode}){return <div className="flex min-h-[96px] items-center gap-3 border-b border-l border-white/[.07] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.055] text-[#66e7d5]">{icon}</span><div><b className="block text-lg text-white">{value}</b><span className="mt-1 block text-[8px] font-bold text-slate-500">{label}</span></div></div>}
function MiniDark({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/[.07] bg-white/[.035] p-3"><b className="block text-lg text-white">{value}</b><span className="mt-1 block text-[8px] text-slate-500">{label}</span></div>}
function SignalCard({icon,label,value}:{icon:ReactNode;label:string;value:number}){return <article className="rounded-[18px] border border-slate-100 bg-[#fbfdfd] p-3.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]">{icon}</span><b className="mt-3 block text-xl text-slate-950">{number(value)}</b><span className="mt-1 block text-[9px] font-bold text-slate-500">{label}</span></article>}
