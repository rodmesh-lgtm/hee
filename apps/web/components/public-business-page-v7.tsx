"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Building2, ChevronDown, Clock3, FileText, Headset, Mail, MapPin, MessageCircle, Phone, Share2, ShoppingBag, UserRound } from "lucide-react";

type BusinessPublicPayload = Prisma.BusinessGetPayload<{ include: { products: { include: { category: true } }; offers: true; services: true; openingHours: true; galleryItems: true; socialLinks: true; branches: true; departments: { include: { contacts: { include: { branch: true } } } } } }>;
type Props = { business: BusinessPublicPayload; qrDataUrl: string; publicUrl: string };

const digits=(v?:string|null)=>String(v??"").replace(/\D/g,"");
const phone=(v?:string|null)=>{const d=digits(v);return d.length>=8&&d.length<=15?d:null};
const text=(v?:string|null)=>{const s=String(v??"").trim();return s.length>=2&&/[\p{L}\p{N}]/u.test(s)?s:null};
const email=(v?:string|null)=>{const s=String(v??"").trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:null};
const url=(v?:string|null)=>{const s=String(v??"").trim();if(!/^https?:\/\//i.test(s))return null;try{return new URL(s).toString()}catch{return null}};

export function PublicBusinessPageV7({business,qrDataUrl,publicUrl}:Props){
 const [share,setShare]=useState(false); const [branchesOpen,setBranchesOpen]=useState(false);
 const wa=phone(business.whatsapp), tel=phone(business.phone), logo=url(business.logoUrl), store=url(business.website), profile=url(business.companyProfileUrl);
 const location=[text(business.city),text(business.district)].filter(Boolean).join("، ");
 const hours=text(business.workingHours)||(()=>{const h=business.openingHours.find(x=>!x.isClosed&&x.opensAt&&x.closesAt);return h?`${h.opensAt} - ${h.closesAt}`:null})();
 const map=url(business.googleMapsLink)||(business.address||business.city?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address,business.city,business.district].filter(Boolean).join(" "))}`:null);
 const services=business.services.filter(s=>s.isActive&&text(s.name)).slice(0,8);
 const gallery=business.galleryItems.filter(g=>g.isActive&&url(g.imageUrl));
 const branches=business.branches.filter(b=>b.isActive&&text(b.name));
 const contacts=useMemo(()=>business.departments.filter(d=>d.isActive).flatMap(d=>d.contacts.filter(c=>c.isActive&&text(c.name)).map(c=>({...c,department:d.name,p:phone(c.phone),w:phone(c.whatsapp),e:email(c.email)}))).filter(c=>c.p||c.w||c.e),[business.departments]);
 const about=text(business.shortDescription)||text(business.description)||`${business.name} تجمع خدماتها ومعلومات التواصل معها في صفحة أعمال واحدة على HEE.`;
 const actions=[
  {label:"واتساب",sub:"تحدث معنا الآن",icon:MessageCircle,href:wa?`https://wa.me/${wa}`:null,green:true},
  {label:"اتصال",sub:"اتصل مباشرة",icon:Phone,href:tel?`tel:${tel}`:null},
  {label:"الموقع",sub:"اعرف طريقك إلينا",icon:MapPin,href:map},
  {label:"تواصل",sub:"اختر الجهة المناسبة",icon:Headset,href:"#hee-directory"},
 ];
 return <main dir="rtl" data-renderer="hee-v7-approved-reference" className="min-h-screen bg-[#f3f5f4] pb-28 text-[#15201c] md:pb-12">
  <div className="mx-auto w-full max-w-[460px] md:max-w-[1180px] md:px-7 md:py-8">
   <div className="overflow-hidden bg-white md:rounded-[32px] md:border md:border-[#e4e9e6] md:shadow-[0_28px_80px_-54px_rgba(0,48,34,.35)]">
    <header className="relative overflow-hidden bg-[#003d31] px-5 pb-[82px] pt-5 text-white md:px-12 md:pb-[96px] md:pt-8">
     <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_50%_0%,rgba(38,170,123,.28),transparent_34%),linear-gradient(145deg,#002d25_0%,#004536_54%,#00372d_100%)]"/>
     <div className="pointer-events-none absolute -left-[12%] bottom-[-118px] h-[210px] w-[125%] -rotate-6 rounded-[50%] border border-white/[.06]"/>
     <div className="relative flex items-center justify-between">
      <button onClick={()=>setShare(v=>!v)} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/[.06]" aria-label="مشاركة"><Share2 className="h-4 w-4"/></button>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.08] px-3 py-1.5 text-[10px] font-extrabold backdrop-blur"><BadgeCheck className="h-4 w-4 text-[#5de2a5]"/>{business.isVerified?"موثق لدى HEE":"صفحة أعمال HEE"}</div>
     </div>
     <div className="relative mx-auto mt-5 grid h-[108px] w-[108px] place-items-center overflow-hidden rounded-full bg-white shadow-[0_18px_45px_rgba(0,0,0,.26)] ring-[5px] ring-white/10 md:h-[122px] md:w-[122px]">
      {logo?<img src={logo} alt={business.name} className="h-full w-full object-contain p-2"/>:<span className="text-[42px] font-black text-[#08785b]">{business.name.charAt(0)}</span>}
     </div>
     <div className="relative text-center"><h1 className="mt-4 text-[24px] font-black tracking-[-.035em] md:text-[32px]">{business.name}</h1><p className="mt-1.5 text-[11px] font-semibold text-white/65 md:text-[13px]">{text(business.businessCategory)||text(business.businessType)||"منشأة أعمال"}</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0e6d55] px-3 py-1.5 text-[9px] font-extrabold text-[#73e7b5]"><i className="h-1.5 w-1.5 rounded-full bg-[#49e29f]"/>منشأة تعمل بنشاط</span></div>
     <div className="relative mx-auto mt-7 grid max-w-[650px] grid-cols-3 divide-x-reverse divide-x divide-white/15 text-center">
      <div className="px-2"><MapPin className="mx-auto h-4 w-4 text-[#60dba4]"/><b className="mt-1.5 block text-[9px] md:text-[11px]">{location||"الموقع"}</b></div>
      <div className="px-2"><Clock3 className="mx-auto h-4 w-4 text-[#60dba4]"/><b className="mt-1.5 block text-[9px] md:text-[11px]">{hours||"ساعات العمل"}</b></div>
      <div className="px-2"><UserRound className="mx-auto h-4 w-4 text-[#60dba4]"/><b className="mt-1.5 block text-[9px] md:text-[11px]">صفحة أعمال موحدة</b></div>
     </div>
     {share?<div className="relative mx-auto mt-5 flex max-w-sm items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><img src={qrDataUrl} alt="QR" className="h-14 w-14 rounded-xl bg-white p-1"/><span className="min-w-0 truncate text-[8px] text-white/65">{publicUrl}</span></div>:null}
    </header>

    <section className="relative z-10 -mt-[55px] px-4 md:-mt-[58px] md:px-12">
     <div className="grid grid-cols-4 rounded-[22px] border border-[#e7ece9] bg-white px-1.5 py-2 shadow-[0_15px_38px_-24px_rgba(0,55,39,.38)] md:px-5 md:py-3">
      {actions.map(({label,sub,icon:Icon,href,green})=><a key={label} href={href||"#"} target={href?.startsWith("http")?"_blank":undefined} rel="noreferrer" aria-disabled={!href} className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl ${href?"":"pointer-events-none opacity-30"}`}><Icon strokeWidth={1.9} className={`h-7 w-7 ${green?"text-[#08a56f]":"text-[#56348d]"}`}/><b className="text-[10px] md:text-[12px]">{label}</b><small className="hidden text-[8px] text-[#939b98] sm:block">{sub}</small></a>)}
     </div>
    </section>

    <div className="px-4 pb-8 pt-4 md:px-12 md:pt-5">
     {(profile||store)?<section className="mb-4 grid grid-cols-2 overflow-hidden rounded-[18px] bg-[#f7f9f8] ring-1 ring-[#e9eeeb]">{profile?<a href={profile} target="_blank" className="flex min-h-[66px] items-center justify-center gap-2 border-l border-[#e5ebe7]"><FileText className="h-6 w-6 text-[#0b9a6b]"/><span><b className="block text-[10px] md:text-[12px]">الملف التعريفي</b><small className="text-[8px] text-[#8b9490]">عن المنشأة وفريق العمل</small></span></a>:<div/>}{store?<a href={store} target="_blank" className="flex min-h-[66px] items-center justify-center gap-2"><ShoppingBag className="h-6 w-6 text-[#0b9a6b]"/><span><b className="block text-[10px] md:text-[12px]">المتجر الإلكتروني</b><small className="text-[8px] text-[#8b9490]">تسوّق خدماتنا</small></span></a>:null}</section>:null}

     <div className="md:grid md:grid-cols-12 md:gap-5">
      <section className="mb-4 rounded-[20px] border border-[#e6ebe8] bg-white p-4 md:col-span-7 md:mb-0 md:p-6"><div className="flex items-center justify-between"><h2 className="text-[14px] font-black md:text-lg">عن المنشأة</h2><Building2 className="h-5 w-5 text-[#0b9a6b]"/></div><p className="mt-3 text-[11px] leading-7 text-[#66716c] md:text-[13px] md:leading-8">{about}</p><span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-[#0b9a6b]">عرض المزيد <ChevronDown className="h-3 w-3"/></span></section>

      <section id="hee-directory" className="mb-4 rounded-[20px] border border-[#e6ebe8] bg-white p-4 md:col-span-5 md:mb-0 md:p-6"><h2 className="text-[14px] font-black md:text-lg">تواصل مع الجهة المناسبة</h2><p className="mt-1 text-[9px] text-[#89928e]">اختر القسم أو الشخص الذي تريد التواصل معه</p><div className="mt-3 divide-y divide-[#edf0ee]">{contacts.length?contacts.slice(0,4).map(c=><div key={c.id} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef8f4] text-[#0b9a6b]"><UserRound className="h-4 w-4"/></div><div className="min-w-0 flex-1"><b className="block truncate text-[10px]">{c.name}</b><span className="block truncate text-[8px] text-[#909895]">{text(c.jobTitle)||c.department}</span></div><div className="flex gap-1.5">{c.w?<a href={`https://wa.me/${c.w}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#e9f8f2] text-[#0a9f6c]"><MessageCircle className="h-3.5 w-3.5"/></a>:null}{c.p?<a href={`tel:${c.p}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#f1eef8] text-[#5c3c8d]"><Phone className="h-3.5 w-3.5"/></a>:null}{c.e?<a href={`mailto:${c.e}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#f1eef8] text-[#5c3c8d]"><Mail className="h-3.5 w-3.5"/></a>:null}</div></div>):<div className="py-6 text-center text-[9px] text-[#9aa19e]">لم تُضف جهات تواصل بعد</div>}</div></section>
     </div>

     {services.length?<section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-[14px] font-black md:text-lg">خدماتنا</h2><p className="mt-1 text-[9px] text-[#8a938f]">نقدم لك خدمات متكاملة بجودة عالية</p></div><span className="text-[9px] font-bold text-[#0b9a6b]">عرض الكل</span></div><div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:px-0">{services.map((s,i)=>{const img=url(s.imageUrl)||url(gallery[i%Math.max(gallery.length,1)]?.imageUrl);return <article key={s.id} className="min-w-[165px] snap-start overflow-hidden rounded-[18px] border border-[#e7ece9] bg-white md:min-w-0"><div className="relative h-[108px] overflow-hidden bg-[linear-gradient(135deg,#dcece6,#b9d5cb)]">{img?<img src={img} alt={s.name} className="h-full w-full object-cover"/>:<div className="absolute inset-0 grid place-items-center"><Building2 className="h-8 w-8 text-[#5f8e7d]/50"/></div>}<span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[7px] font-bold text-[#0a815d]">خدمة</span></div><div className="p-3"><b className="block truncate text-[10px]">{s.name}</b><p className="mt-1 line-clamp-2 text-[8px] leading-4 text-[#89928e]">{text(s.description)||"خدمة مقدمة باحترافية وجودة عالية"}</p></div></article>})}</div></section>:null}

     {branches.length?<section className="mt-5 overflow-hidden rounded-[20px] border border-[#e6ebe8] bg-white"><button onClick={()=>setBranchesOpen(v=>!v)} className="flex w-full items-center justify-between p-4 text-right"><span><b className="block text-[13px]">فروعنا</b><small className="mt-1 block text-[8px] text-[#929a96]">{branches.length} {branches.length===1?"فرع":"فروع"}</small></span><ChevronDown className={`h-4 w-4 text-[#77817d] transition ${branchesOpen?"rotate-180":""}`}/></button>{branchesOpen?<div className="divide-y divide-[#edf0ee] border-t border-[#edf0ee] px-4">{branches.map(b=><div key={b.id} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef8f4] text-[#0b9a6b]"><MapPin className="h-4 w-4"/></div><div><b className="text-[10px]">{b.name}</b><p className="mt-1 text-[8px] text-[#929a96]">{[text(b.city),text(b.district),text(b.address)].filter(Boolean).join("، ")||"بيانات الموقع غير مضافة"}</p></div></div>)}</div>:null}</section>:null}
    </div>
   </div>
  </div>
 </main>
}
