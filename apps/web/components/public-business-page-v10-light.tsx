"use client";

import {useMemo,useState} from "react";
import type {Prisma} from "@prisma/client";
import {BadgeCheck,ChevronDown,ChevronUp,Clock3,Mail,MapPin,MessageCircle,Phone,Share2,Sparkles,Star,UsersRound,ShieldCheck,UserRound,Wrench,Home,AirVent} from "lucide-react";

type Business=Prisma.BusinessGetPayload<{include:{products:{include:{category:true}};offers:true;services:true;openingHours:true;galleryItems:true;socialLinks:true;branches:true;departments:{include:{contacts:{include:{branch:true}}}}}}>;
type Props={business:Business;qrDataUrl:string;publicUrl:string};
const clean=(v?:string|null)=>String(v??"").trim();
const digits=(v?:string|null)=>clean(v).replace(/\D/g,"");
const url=(v?:string|null)=>{const s=clean(v);if(!s)return null;try{return new URL(/^https?:\/\//i.test(s)?s:`https://${s}`).toString()}catch{return null}};

export function PublicBusinessPageV10Light({business,publicUrl}:Props){
 const [servicesOpen,setServicesOpen]=useState(true),[branchesOpen,setBranchesOpen]=useState(false);
 const wa=digits(business.whatsapp)||"966564212464", tel=digits(business.phone)||"966500000001";
 const location=[clean(business.city)||"جدة",clean(business.district)||"حي الروضة"].filter(Boolean).join("، ");
 const category=clean(business.businessCategory)||clean(business.businessType)||"خدمات احترافية بمعايير عالية";
 const about=clean(business.shortDescription)||clean(business.description)||"نقدم خدمات احترافية بجودة عالية وموثوقية تامة، بفريق مدرب ومجهز بأفضل المعدات والحلول المناسبة.";
 const logo=url(business.logoUrl);
 const rawServices=business.services.filter(s=>s.isActive&&clean(s.name)).slice(0,6);
 const services=rawServices.length?rawServices.map((s,i)=>({id:String(s.id),name:s.name,desc:clean(s.description)||"خدمة احترافية مصممة لتلبية احتياج العميل بأعلى جودة.",icon:i%3})):[{id:"1",name:"تنظيف المنازل والفلل",desc:"تنظيف شامل للمنازل والفلل باستخدام أفضل المعدات.",icon:0},{id:"2",name:"صيانة منزلية",desc:"حلول صيانة وإصلاح لجميع الأعمال المنزلية.",icon:1},{id:"3",name:"تركيب وصيانة المكيفات",desc:"تركيب وصيانة دورية لمختلف أنواع المكيفات.",icon:2}];
 const rawBranches=business.branches.filter(b=>b.isActive&&clean(b.name)).slice(0,6);
 const branches=rawBranches.length?rawBranches.map((b,i)=>({id:String(b.id),name:b.name,place:[b.city,b.district,b.address].filter(Boolean).join("، ")||`الفرع ${i+1}`})):[{id:"1",name:"الفرع الرئيسي",place:"جدة، حي الروضة"},{id:"2",name:"فرع شمال جدة",place:"جدة، حي الزهراء"},{id:"3",name:"فرع جنوب جدة",place:"جدة، حي الأجاويد"},{id:"4",name:"فرع شرق جدة",place:"جدة"}];
 const realContacts=useMemo(()=>business.departments.filter(d=>d.isActive).flatMap(d=>d.contacts.filter(c=>c.isActive&&clean(c.name)).map(c=>({id:String(c.id),name:c.name,role:clean(c.jobTitle)||clean(d.name)||"خدمة العملاء",image:url(c.imageUrl),p:digits(c.phone)||tel,w:digits(c.whatsapp)||wa}))).slice(0,6),[business.departments,wa,tel]);
 const contacts=realContacts.length?realContacts:[{id:"1",name:"سارة خالد",role:"تنسيق ومتابعة",image:null,p:tel,w:wa},{id:"2",name:"محمد فيصل",role:"مشرف عمليات",image:null,p:tel,w:wa},{id:"3",name:"فاطمة علي",role:"خدمة عملاء",image:null,p:tel,w:wa},{id:"4",name:"أحمد سالم",role:"فني صيانة",image:null,p:tel,w:wa}];
 const hour=business.openingHours.find(h=>!h.isClosed&&h.opensAt&&h.closesAt); const hours=clean(business.workingHours)||(hour?`${hour.opensAt} - ${hour.closesAt}`:"السبت - الخميس، 8:00 ص - 10:00 م");
 const map=url(business.googleMapsLink)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
 const share=async()=>{if(navigator.share){try{await navigator.share({title:business.name,url:publicUrl});return}catch{}}await navigator.clipboard?.writeText(publicUrl)};
 const SIcon=[Sparkles,Wrench,AirVent];
 return <main dir="rtl" className="min-h-screen bg-white text-[#17131b] selection:bg-violet-100">
  <div className="mx-auto w-full max-w-[1040px] px-4 pb-8 sm:px-6">
   <header dir="ltr" className="flex h-[82px] items-center justify-between border-b border-[#eeeaf2]">
    <a href="/" aria-label="HEE" className="group relative text-[34px] font-black tracking-[-.09em] text-transparent bg-clip-text bg-gradient-to-r from-[#4d7cff] via-[#8a42df] to-[#6c35c4]">HEE<span className="absolute -right-2 -top-1 text-[13px] text-[#4d7cff] transition-transform group-hover:rotate-45">✦</span></a>
    <div className="flex gap-2"><button onClick={share} aria-label="مشاركة" className="grid h-11 w-11 place-items-center rounded-full border border-[#e7e2eb] bg-white shadow-sm"><Share2 className="h-5 w-5"/></button><button aria-label="المزيد" className="grid h-11 w-11 place-items-center rounded-full border border-[#e7e2eb] bg-white text-xl">⋮</button></div>
   </header>
   <div className="flex items-center gap-2 py-5 text-[13px] font-bold text-[#5e3a9f]"><span className="h-2 w-2 rotate-45 bg-[#8a4bd0]"/>هوية أعمال رقمية</div>

   <section className="grid items-center gap-6 pb-7 md:grid-cols-[210px_1fr]">
    <div className="mx-auto grid h-[190px] w-[190px] place-items-center overflow-hidden rounded-[30px] border border-[#e8e3eb] bg-gradient-to-br from-[#17352f] to-[#10231f] shadow-[0_16px_45px_rgba(35,25,45,.10)] md:mx-0">{logo?<img src={logo} alt={business.name} className="h-full w-full object-cover"/>:<div className="text-center text-[#e2b85f]"><Sparkles className="mx-auto h-12 w-12"/><b className="mt-3 block text-2xl">{business.name}</b></div>}</div>
    <div><div className="flex items-center gap-2"><h1 className="max-w-[720px] text-[29px] font-black leading-[1.25] tracking-tight sm:text-[38px] md:text-[46px]">{business.name}</h1>{business.isVerified&&<BadgeCheck className="h-7 w-7 shrink-0 fill-[#2f80ed] text-white sm:h-8 sm:w-8"/>}</div><p className="mt-2 text-[17px] text-[#77717c] sm:text-xl">{category}</p><div className="mt-5 flex flex-wrap gap-2 text-[12px]"><span className="rounded-xl bg-emerald-50 px-3 py-2 font-bold text-emerald-600">● مفتوح الآن</span><span className="rounded-xl bg-[#faf7fc] px-3 py-2"><MapPin className="ml-1 inline h-4 w-4 text-[#7441bc]"/>{location}</span><span className="rounded-xl bg-[#faf7fc] px-3 py-2"><Wrench className="ml-1 inline h-4 w-4 text-[#7441bc]"/>{clean(business.businessType)||"خدمات وصيانة"}</span></div></div>
   </section>

   <section className="mb-4 rounded-[24px] border border-[#ebe7ee] bg-white px-6 py-7 text-center shadow-[0_10px_35px_rgba(55,38,65,.035)]"><p className="mx-auto max-w-3xl text-[15px] leading-8 text-[#68616d] sm:text-[18px]">{about}</p></section>
   <section className="mb-4 grid grid-cols-4 divide-x divide-x-reverse divide-[#ebe7ee] rounded-[24px] border border-[#ebe7ee] bg-white py-5"><Metric icon={ShieldCheck} value="موثوق" label="خدمة موثوقة"/><Metric icon={Star} value="4.9" label="تقييم العملاء"/><Metric icon={UsersRound} value="500+" label="عميل سعيد"/><Metric icon={Clock3} value="5+ سنوات" label="خبرة في المجال"/></section>

   <Box title="خدماتنا" action="عرض جميع الخدمات">
    <div className="space-y-2">{services.slice(0,servicesOpen?6:3).map((s,i)=>{const I=SIcon[s.icon%3];return <div key={s.id} className="flex items-center gap-4 rounded-[17px] border border-[#eee9f1] p-4 transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f5effb] text-[#7139ba]"><I className="h-6 w-6"/></span><div className="min-w-0 flex-1"><b className="block text-[15px] sm:text-[17px]">{s.name}</b><p className="mt-1 line-clamp-1 text-[11px] text-[#77717c] sm:text-[13px]">{s.desc}</p></div><span className="text-2xl text-[#7139ba]">‹</span></div>})}</div>
    {services.length>3&&<button onClick={()=>setServicesOpen(!servicesOpen)} className="mt-3 text-xs font-bold text-[#7139ba]">{servicesOpen?"عرض أقل":"عرض المزيد"}</button>}
   </Box>

   <Box title="فروعنا" action={branchesOpen?"إغلاق الفروع":"عرض كل الفروع"} onAction={()=>setBranchesOpen(!branchesOpen)}>
    <button onClick={()=>setBranchesOpen(!branchesOpen)} className="flex w-full items-center gap-4 rounded-[17px] border border-[#eee9f1] p-4 text-right"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5effb] text-[#7139ba]"><MapPin/></span><div className="flex-1"><b className="text-lg">{branches.length} فروع</b><p className="text-xs text-[#77717c]">اضغط لعرض الفروع ومعلومات التواصل</p></div>{branchesOpen?<ChevronUp className="text-[#7139ba]"/>:<ChevronDown className="text-[#7139ba]"/>}</button>
    {branchesOpen&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{branches.map(b=><a key={b.id} href={map} target="_blank" className="rounded-2xl border border-[#eee9f1] p-4"><b>{b.name}</b><p className="mt-1 text-xs text-[#77717c]">{b.place}</p></a>)}</div>}
   </Box>

   <Box title="فريق العمل" action="أشخاص لخدمتك"><div className="flex gap-3 overflow-x-auto pb-2">{contacts.map(c=><article key={c.id} className="min-w-[170px] flex-1 rounded-[18px] border border-[#ebe6ef] p-4 text-center"><div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#f3edf8]">{c.image?<img src={c.image} alt="" className="h-full w-full object-cover"/>:<UserRound className="h-7 w-7 text-[#6e39b2]"/>}</div><b className="mt-3 block">{c.name}</b><p className="text-xs text-[#746d78]">{c.role}</p><div className="mt-3 flex justify-center gap-2"><a href={`tel:${c.p}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#f5effb]"><Phone className="h-4 w-4"/></a><a href={`https://wa.me/${c.w}`} className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600"><MessageCircle className="h-4 w-4"/></a></div></article>)}</div></Box>

   <Box title="تواصل معنا"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Contact href={business.email?`mailto:${business.email}`:undefined} icon={Mail} label="البريد الإلكتروني"/><Contact href={map} icon={MapPin} label="الموقع"/><Contact href={`https://wa.me/${wa}`} icon={MessageCircle} label="واتساب" green/><Contact href={`tel:${tel}`} icon={Phone} label="اتصال"/></div><div className="mt-3 flex items-center gap-2 text-[11px] text-[#77717c]"><Clock3 className="h-4 w-4"/>{hours}</div></Box>

   <footer dir="ltr" className="mt-6 flex items-center justify-between border-t border-[#eeeaf2] py-6"><a href="/" className="text-[30px] font-black tracking-[-.08em] text-[#6940c8]">HEE</a><span dir="rtl" className="text-xs text-[#77717c]">✦ هوية أعمال رقمية</span></footer>
  </div>
 </main>
}

function Metric({icon:Icon,value,label}:{icon:any,value:string,label:string}){return <div className="px-1 text-center"><Icon className="mx-auto h-5 w-5 text-[#6e36b5] sm:h-6 sm:w-6"/><b className="mt-2 block text-[12px] sm:text-base">{value}</b><span className="mt-1 block text-[9px] text-[#817a85] sm:text-xs">{label}</span></div>}
function Box({title,action,onAction,children}:{title:string;action?:string;onAction?:()=>void;children:React.ReactNode}){return <section className="mb-4 rounded-[24px] border border-[#ebe7ee] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[19px] font-black sm:text-[22px]"><span className="h-2 w-2 rounded-full bg-[#7b3fc3]"/>{title}</h2>{action&&(onAction?<button onClick={onAction} className="text-xs font-bold text-[#7139ba]">{action}</button>:<span className="text-xs font-bold text-[#7139ba]">{action}</span>)}</div>{children}</section>}
function Contact({href,icon:Icon,label,green}:{href?:string;icon:any;label:string;green?:boolean}){const cls="flex min-h-[94px] flex-col items-center justify-center rounded-[17px] border border-[#eee9f1] text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md";const body=<><Icon className={`mb-2 h-6 w-6 ${green?"text-emerald-500":"text-[#7139ba]"}`}/>{label}</>;return href?<a href={href} target={href.startsWith("http")?"_blank":undefined} className={cls}>{body}</a>:<div className={cls}>{body}</div>}
