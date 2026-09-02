import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity,BadgeCheck,BarChart3,Building2,CalendarClock,CheckCircle2,Eye,FileText,Inbox,MailWarning,MousePointerClick,Palette,Rocket,ShoppingBag,Store,UserRound,ArrowLeft,Sparkles,Target,MoveUpLeft,Zap } from "lucide-react";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { getPublicBusinessUrlFromRequest } from "../lib/public-url";

const actionableOrderStatuses=["pending","confirmed","processing"] as const;
const actionableBookingStatuses=["pending","confirmed"] as const;
const interactionEvents=["whatsapp_click","phone_click","share_click","website_click","map_click","company_profile_click","social_click"] as const;
type DashboardClock={since7d:Date;today:string};
function metricNumber(v:number){return new Intl.NumberFormat("ar-SA").format(v)}

export default async function DashboardHomePage(){
  const user=await getCurrentUser();
  if(!user)redirect("/login");
  const business=await getActiveBusinessWithPlanForUser(user.id);
  if(!business)return <section className="relative mx-auto max-w-2xl overflow-hidden rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.06)] sm:p-9"><div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-[#c9f8f0] blur-3xl"/><span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#07181b] text-[#35e4cb]"><Rocket className="h-5 w-5"/></span><p className="relative mt-5 text-[9px] font-black tracking-[.18em] text-[#008f87]" dir="ltr">INFRO WORKSPACE</p><h1 className="relative mt-2 text-2xl font-black">ابدأ هويتك الرقمية</h1><p className="relative mt-2 text-sm leading-7 text-slate-500">أنشئ الأساس مرة واحدة، ثم اجعل INFRO مساحة تشغيل حضورك الرقمي والتسويقي.</p><Link href="/onboarding" className="relative mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#07181b] px-5 text-sm font-black text-white">إنشاء الصفحة</Link></section>;

  const[clock]=await db.$queryRaw<DashboardClock[]>`SELECT CURRENT_TIMESTAMP - INTERVAL '7 days' AS "since7d",to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') AS "today"`;
  if(!clock)throw new Error("dashboard clock unavailable");
  const{since7d,today}=clock;
  const[actionableOrders,actionableBookings,pendingOrders,pendingBookings,services,branches,contacts,views7d,interactions7d,orders7d,bookings7d,nextBooking]=await Promise.all([
    db.order.count({where:{businessId:business.id,status:{in:[...actionableOrderStatuses]}}}),
    db.booking.count({where:{businessId:business.id,status:{in:[...actionableBookingStatuses]}}}),
    db.order.count({where:{businessId:business.id,status:"pending"}}),
    db.booking.count({where:{businessId:business.id,status:"pending"}}),
    db.service.count({where:{businessId:business.id,isActive:true,deletedAt:null}}),
    db.branch.count({where:{businessId:business.id,isActive:true}}),
    db.contactPerson.count({where:{businessId:business.id,isActive:true}}),
    db.analyticsEvent.count({where:{businessId:business.id,eventType:"page_view",createdAt:{gte:since7d}}}),
    db.analyticsEvent.count({where:{businessId:business.id,eventType:{in:[...interactionEvents]},createdAt:{gte:since7d}}}),
    db.order.count({where:{businessId:business.id,createdAt:{gte:since7d}}}),
    db.booking.count({where:{businessId:business.id,createdAt:{gte:since7d}}}),
    db.booking.findFirst({where:{businessId:business.id,status:{in:[...actionableBookingStatuses]},bookingDate:{gte:today}},orderBy:[{bookingDate:"asc"},{bookingTime:"asc"}],select:{id:true,bookingDate:true,bookingTime:true,customer:{select:{name:true}},service:{select:{name:true}}}}),
  ]);

  const actionableTransactions=actionableOrders+actionableBookings;
  const newTransactions=pendingOrders+pendingBookings;
  const publicUrl=await getPublicBusinessUrlFromRequest(business.slug);
  const effectivelyPublished=Boolean(business.isPublished&&user.emailVerifiedAt);
  const identityReady=Boolean(business.name&&business.shortDescription&&(business.phone||business.whatsapp));
  const tasks=[
    {label:"بيانات الصفحة",description:"الاسم، النبذة والتواصل",ready:identityReady,href:"/dashboard/my-page",icon:UserRound},
    {label:"الخدمات",description:services?`${services} مضافة`:"أضف خدماتك",ready:services>0,href:"/dashboard/services",icon:Store},
    {label:"الفروع والفريق",description:`${branches} فروع · ${contacts} فريق`,ready:branches>0,href:"/dashboard/directory",icon:Building2},
    {label:"الشعار والمظهر",description:business.logoUrl?"الهوية جاهزة":"أضف شعارك",ready:Boolean(business.logoUrl),href:"/dashboard/branding",icon:Palette},
    {label:"الملف التعريفي PDF",description:business.companyProfileUrl?"مرفوع ويظهر في الصفحة":"أضف ملف الشركة الرسمي",ready:Boolean(business.companyProfileUrl),href:"/dashboard/digital-identity#company-profile",icon:FileText},
  ];
  const completed=tasks.filter(t=>t.ready).length;
  const progress=Math.round(completed/tasks.length*100);
  const nextTask=tasks.find(t=>!t.ready);
  const pulse=[
    {label:"الزيارات",value:views7d,icon:Eye,href:"/dashboard/analytics"},
    {label:"التفاعل",value:interactions7d,icon:MousePointerClick,href:"/dashboard/analytics"},
    {label:"الطلبات",value:orders7d,icon:ShoppingBag,href:"/dashboard/inbox"},
    {label:"الحجوزات",value:bookings7d,icon:CalendarClock,href:"/dashboard/inbox"},
  ];

  const primaryAction=!user.emailVerifiedAt?{title:"أكد بريد الحساب",description:"التأكيد مطلوب قبل النشر العام.",href:"/dashboard/settings",icon:MailWarning,tone:"amber"}:actionableTransactions?{title:`${actionableTransactions} عنصر يحتاج متابعة`,description:`${newTransactions?`${newTransactions} جديد · `:""}${actionableOrders} طلب · ${actionableBookings} حجز`,href:"/dashboard/inbox",icon:Inbox,tone:"teal"}:nextTask?{title:`أكمل ${nextTask.label}`,description:nextTask.description,href:nextTask.href,icon:nextTask.icon,tone:"slate"}:{title:"هويتك الأساسية جاهزة",description:"راجع الأداء أو حسّن محتوى صفحتك.",href:"/dashboard/analytics",icon:CheckCircle2,tone:"green"};
  const PrimaryIcon=primaryAction.icon;

  return <div className="space-y-4 pb-4">
    <section className="grid overflow-hidden rounded-[28px] border border-[#163538] bg-[#07181b] shadow-[0_22px_70px_-42px_rgba(7,24,27,.7)] xl:grid-cols-[1fr_360px]">
      <div className="relative p-5 text-white sm:p-6 lg:p-7"><div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/14 blur-3xl"/><div className="relative flex h-full flex-col justify-between gap-8"><div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.05] px-2.5 py-1 text-[8px] font-black tracking-[.12em] text-[#8ff5e6]" dir="ltr"><Sparkles className="h-3 w-3"/>INFRO COMMAND SPACE</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${effectivelyPublished?"bg-emerald-400/15 text-emerald-200":"bg-amber-300/15 text-amber-200"}`}>{effectivelyPublished?"LIVE":"DRAFT"}</span>{business.isVerified?<span className="inline-flex items-center gap-1 rounded-full bg-sky-300/10 px-2.5 py-1 text-[8px] font-black text-sky-200"><BadgeCheck className="h-3 w-3"/>VERIFIED</span>:null}</div><h1 className="mt-4 text-2xl font-black tracking-tight sm:text-[32px]">{business.name}</h1><p className="mt-2 max-w-xl text-xs leading-6 text-slate-400">ركز على ما يحتاج قرارك الآن. بقية أدوات الهوية والتسويق والعمل تعمل من نفس المساحة.</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/my-page" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#35e4cb] px-4 text-[11px] font-black text-[#07181b]">تحرير هويتي <MoveUpLeft className="h-3.5 w-3.5"/></Link><a href={effectivelyPublished?publicUrl:"/preview"} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[.04] px-4 text-[11px] font-black text-white"><Eye className="h-3.5 w-3.5"/>{effectivelyPublished?"فتح الصفحة":"معاينة"}</a></div></div></div>
      <Link href={primaryAction.href} className="group relative flex min-h-[190px] flex-col justify-between border-t border-white/[.08] bg-white/[.035] p-5 text-white transition hover:bg-white/[.06] xl:border-r xl:border-t-0"><div className="flex items-center justify-between"><span className="text-[8px] font-black tracking-[.15em] text-[#66e7d5]" dir="ltr">FOCUS NOW</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${primaryAction.tone==="amber"?"bg-amber-400/15 text-amber-200":primaryAction.tone==="green"?"bg-emerald-400/15 text-emerald-200":"bg-[#35e4cb]/12 text-[#66e7d5]"}`}><PrimaryIcon className="h-4 w-4"/></span></div><div><h2 className="text-lg font-black">{primaryAction.title}</h2><p className="mt-2 text-[11px] leading-6 text-slate-400">{primaryAction.description}</p></div><div className="flex items-center gap-2 text-[10px] font-black text-[#66e7d5]">ابدأ الآن <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1"/></div></Link>
    </section>

    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9fbf8] text-[#008f87]"><Activity className="h-3.5 w-3.5"/></span><div><h2 className="text-xs font-black text-slate-900">آخر 7 أيام</h2><p className="text-[9px] text-slate-400">أرقام حقيقية من نشاط صفحتك</p></div></div><Link href="/dashboard/analytics" className="text-[9px] font-black text-[#008f87]">التفاصيل ←</Link></div><div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0 rtl:divide-x-reverse">{pulse.map(item=>{const Icon=item.icon;return <Link key={item.label} href={item.href} className="group flex items-center gap-3 px-4 py-4 transition hover:bg-[#f8fdfc]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-[#009d93] group-hover:bg-[#e9fbf8]"><Icon className="h-3.5 w-3.5"/></span><div><b className="block text-lg leading-none text-slate-950">{metricNumber(item.value)}</b><span className="mt-1.5 block text-[9px] font-semibold text-slate-400">{item.label}</span></div></Link>})}</div></section>

    <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-4"><div><span className="text-[8px] font-black tracking-[.15em] text-[#008f87]" dir="ltr">IDENTITY JOURNEY</span><h2 className="mt-1 text-base font-black text-slate-950">من الأساس إلى حضور مكتمل</h2></div><div className="text-left"><b className="text-xl text-[#008f87]">{progress}%</b><p className="text-[8px] text-slate-400">{completed}/{tasks.length} مكتمل</p></div></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00bfae] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-5 grid gap-2 sm:grid-cols-5">{tasks.map((task,index)=>{const Icon=task.icon;return <Link key={task.label} href={task.href} className={`group relative rounded-2xl border p-3 transition ${task.ready?"border-emerald-100 bg-emerald-50/45":"border-slate-100 bg-[#fbfcfc] hover:border-[#bdebe5] hover:bg-white"}`}><div className="flex items-center justify-between"><span className={`grid h-8 w-8 place-items-center rounded-lg ${task.ready?"bg-emerald-100 text-emerald-600":"bg-white text-slate-400 shadow-sm"}`}>{task.ready?<CheckCircle2 className="h-3.5 w-3.5"/>:<Icon className="h-3.5 w-3.5"/>}</span><span className="text-[8px] font-black text-slate-300">0{index+1}</span></div><b className="mt-4 block text-[10px] text-slate-800">{task.label}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{task.description}</span></Link>})}</div></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {nextBooking?<Link href="/dashboard/inbox" className="group rounded-[24px] border border-slate-200 bg-white p-5 transition hover:border-[#bdebe5]"><div className="flex items-center justify-between"><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">NEXT APPOINTMENT</span><CalendarClock className="h-4 w-4 text-[#009d93]"/></div><b className="mt-4 block truncate text-sm text-slate-900">{nextBooking.customer.name}</b><span className="mt-1 block truncate text-[10px] text-slate-400">{nextBooking.bookingDate} · {nextBooking.bookingTime}{nextBooking.service?.name?` · ${nextBooking.service.name}`:""}</span><span className="mt-4 inline-flex items-center gap-1 text-[9px] font-black text-[#008f87]">فتح الحجوزات <ArrowLeft className="h-3 w-3"/></span></Link>:<div className="rounded-[24px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">NEXT APPOINTMENT</span><CalendarClock className="h-4 w-4 text-slate-300"/></div><b className="mt-4 block text-sm text-slate-800">لا يوجد موعد قادم</b><p className="mt-1 text-[10px] leading-5 text-slate-400">عند وصول حجز مؤكد سيظهر هنا مباشرة.</p></div>}
        <div className="relative overflow-hidden rounded-[24px] bg-[#0b2529] p-5 text-white"><div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-[#00d8c6]/15 blur-2xl"/><div className="relative flex items-center justify-between"><span className="text-[8px] font-black tracking-[.15em] text-[#6eead8]" dir="ltr">CURRENT PLAN</span><Zap className="h-4 w-4 text-[#66e7d5]"/></div><h2 className="relative mt-4 text-lg font-black">{business.plan?.name||"Free"}</h2><p className="relative mt-1 text-[10px] leading-5 text-slate-400">الباقة وإعدادات الحساب دون تشتيت مساحة العمل.</p><Link href="/dashboard/settings" className="relative mt-5 inline-flex items-center gap-2 text-[9px] font-black text-[#6eead8]">الحساب والباقات <ArrowLeft className="h-3 w-3"/></Link></div>
      </section>
    </div>

    <section className="rounded-[24px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-4"><div><span className="text-[8px] font-black tracking-[.14em] text-slate-400" dir="ltr">WORKSPACE SHORTCUTS</span><h2 className="mt-1 text-sm font-black text-slate-900">أدوات عندما تحتاجها</h2></div><Target className="h-4 w-4 text-[#009d93]"/></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><Shortcut href="/dashboard/digital-identity" icon={<BadgeCheck className="h-4 w-4"/>} title="الهوية الرقمية" text="ملف الشركة وSEO وأصول هويتك"/><Shortcut href="/dashboard/business-store" icon={<ShoppingBag className="h-4 w-4"/>} title="متجر الأعمال" text="منتجات تدعم حضور منشأتك"/><Shortcut href="/dashboard/analytics" icon={<BarChart3 className="h-4 w-4"/>} title="الأداء" text="افهم الزيارات والتفاعل"/></div></section>
  </div>;
}

function Shortcut({href,icon,title,text}:{href:string;icon:React.ReactNode;title:string;text:string}){return <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#fbfcfc] p-3 transition hover:border-[#bdebe5] hover:bg-white"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#008f87] shadow-sm">{icon}</span><div className="min-w-0"><b className="block text-[10px] text-slate-800">{title}</b><span className="mt-1 block truncate text-[8px] text-slate-400">{text}</span></div><ArrowLeft className="mr-auto h-3 w-3 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-[#009d93]"/></Link>}
