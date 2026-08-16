"use client";

import {useMemo,useState} from "react";
import type {Prisma} from "@prisma/client";
import {
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

type BusinessPublicPayload = Prisma.BusinessGetPayload<{
  include: {
    products: { include: { category: true } };
    offers: true;
    services: true;
    openingHours: true;
    galleryItems: true;
    socialLinks: true;
    branches: true;
    departments: { include: { contacts: { include: { branch: true } } } };
  };
}>;

type Props = {business: BusinessPublicPayload; qrDataUrl: string; publicUrl: string};

const digits=(v?:string|null)=>String(v??"").replace(/\D/g,"");
const phone=(v?:string|null)=>{const d=digits(v);return d.length>=8&&d.length<=15?d:null};
const cleanText=(v?:string|null)=>{const s=String(v??"").trim();return s.length>=2&&/[\p{L}\p{N}]/u.test(s)?s:null};
const cleanEmail=(v?:string|null)=>{const s=String(v??"").trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:null};
const httpUrl=(v?:string|null)=>{const s=String(v??"").trim();if(!s)return null;const candidate=/^https?:\/\//i.test(s)?s:`https://${s}`;try{const u=new URL(candidate);return /^https?:$/i.test(u.protocol)?u.toString():null}catch{return null}};

export function PublicBusinessPageV9({business,qrDataUrl,publicUrl}:Props){
  const [shareOpen,setShareOpen]=useState(false);
  const [branchesOpen,setBranchesOpen]=useState(false);

  const wa=phone(business.whatsapp);
  const tel=phone(business.phone);
  const logo=httpUrl(business.logoUrl);
  const cover=httpUrl(business.coverUrl);
  const website=httpUrl(business.website);
  const profile=httpUrl(business.companyProfileUrl);
  const email=cleanEmail(business.email);
  const mapHref=httpUrl(business.googleMapsLink)||(business.address||business.city?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address,business.district,business.city].filter(Boolean).join(" "))}`:null);
  const location=[cleanText(business.city),cleanText(business.district)].filter(Boolean).join("، ");
  const about=cleanText(business.shortDescription)||cleanText(business.description)||`${business.name} — صفحة الأعمال الرسمية على HEE.`;
  const services=business.services.filter(s=>s.isActive&&cleanText(s.name)).slice(0,8);
  const gallery=business.galleryItems.filter(g=>g.isActive&&httpUrl(g.imageUrl)).slice(0,10);
  const branches=business.branches.filter(b=>b.isActive&&cleanText(b.name));
  const firstOpenHour=business.openingHours.find(h=>!h.isClosed&&h.opensAt&&h.closesAt);
  const hours=cleanText(business.workingHours)||(firstOpenHour?`${firstOpenHour.opensAt} - ${firstOpenHour.closesAt}`:null);
  const contacts=useMemo(()=>business.departments.filter(d=>d.isActive).flatMap(d=>d.contacts.filter(c=>c.isActive&&cleanText(c.name)).map(c=>({
    ...c,
    department:d.name,
    p:phone(c.phone),
    w:phone(c.whatsapp),
    e:cleanEmail(c.email),
    image:httpUrl(c.imageUrl),
  }))).filter(c=>c.p||c.w||c.e).slice(0,6),[business.departments]);
  const socialLinks=[business.instagramUrl,business.tiktokUrl,business.snapchatUrl,business.xUrl,business.facebookUrl].map(httpUrl).filter((v):v is string=>Boolean(v));
  const requestHref=wa?`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، أرغب في طلب خدمة من ${business.name}`)}`:null;
  const typeLabel=cleanText(business.businessCategory)||cleanText(business.businessType)||"منشأة أعمال";

  return <main dir="rtl" data-renderer="hee-v9-corporate-profile" className="min-h-screen bg-white text-[#17151d]">
    <section className="relative min-h-[440px] overflow-hidden bg-[#211b28] text-white md:min-h-[520px]">
      {cover?<img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(126,83,178,.28),transparent_34%),linear-gradient(135deg,#2e2634,#151218_62%,#2d2237)]"/>}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,14,20,.91)_0%,rgba(23,18,28,.72)_42%,rgba(22,17,27,.28)_76%,rgba(12,10,14,.16)_100%)] md:bg-[linear-gradient(90deg,rgba(17,14,20,.92)_0%,rgba(20,16,24,.72)_38%,rgba(14,12,17,.25)_72%,rgba(12,10,14,.08)_100%)]"/>

      <div className="relative mx-auto max-w-[1240px] px-5 pb-28 pt-5 md:px-8 md:pb-32 md:pt-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={()=>setShareOpen(v=>!v)} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[12px] font-black text-[#19141f] shadow-lg md:h-11 md:text-[13px]"><Share2 className="h-4 w-4"/>مشاركة</button>
            <a href={tel?`tel:${tel}`:"#"} className={`grid h-10 w-10 place-items-center rounded-full bg-white text-[#6540a2] shadow-lg md:h-11 md:w-11 ${tel?"":"pointer-events-none opacity-45"}`}><Phone className="h-4 w-4"/></a>
            <a href={wa?`https://wa.me/${wa}`:"#"} target={wa?"_blank":undefined} rel="noreferrer" className={`grid h-10 w-10 place-items-center rounded-full bg-white text-[#139b61] shadow-lg md:h-11 md:w-11 ${wa?"":"pointer-events-none opacity-45"}`}><MessageCircle className="h-4 w-4"/></a>
            <button onClick={()=>setShareOpen(v=>!v)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#211b28] shadow-lg md:h-11 md:w-11"><MoreHorizontal className="h-5 w-5"/></button>
          </div>
          <div className="flex items-center gap-3"><span className="text-[28px] font-black tracking-[-.08em] text-[#6c48b4] md:text-[34px]">HEE</span><Menu className="h-6 w-6"/></div>
        </div>

        {shareOpen?<div className="absolute left-5 top-[72px] z-20 flex w-[280px] items-center gap-3 rounded-2xl bg-white p-3 text-[#211b28] shadow-2xl md:left-8"><img src={qrDataUrl} alt="QR" className="h-14 w-14 rounded-xl border border-[#eee8f4] p-1"/><div className="min-w-0"><b className="block text-[11px]">رابط الصفحة</b><span className="mt-1 block truncate text-[9px] text-[#7d7585]">{publicUrl}</span></div></div>:null}

        <div className="mt-14 grid items-end gap-10 md:mt-20 md:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-[660px]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#5d3a9b] shadow-md"><BadgeCheck className="h-4 w-4 fill-[#5d3a9b] text-white"/>{business.isVerified?"موثق من HEE":"صفحة أعمال على HEE"}</div>
            <h1 className="mt-5 text-[38px] font-black leading-[1.14] tracking-[-.035em] md:text-[54px]">{business.name}</h1>
            <h2 className="mt-2 text-[24px] font-extrabold text-white/95 md:text-[34px]">{typeLabel}</h2>
            <p className="mt-3 max-w-[590px] text-[14px] font-medium leading-7 text-white/88 md:text-[17px] md:leading-8">{about}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] font-bold md:text-[14px]">
              {location?<span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#9b70d7]"/>{location}</span>:null}
              <span className="inline-flex items-center gap-2 rounded-full bg-[#253328]/85 px-3 py-1.5 text-[#7ee09a]"><i className="h-2 w-2 rounded-full bg-[#5ad17d]"/>مفتوح الآن</span>
            </div>
          </div>

          <div className="hidden justify-self-end md:block">
            <div className="grid h-[238px] w-[238px] place-items-center overflow-hidden rounded-[28px] bg-white p-7 shadow-[0_22px_60px_rgba(0,0,0,.3)]">
              {logo?<img src={logo} alt={business.name} className="h-full w-full object-contain"/>:<div className="text-center"><div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#f1eaf8] text-[60px] font-black text-[#5c379c]">{business.name.charAt(0)}</div><b className="mt-4 block text-[22px] text-[#5c379c]">{business.name}</b></div>}
            </div>
          </div>
        </div>
      </div>
    </section>

    <div className="relative z-20 mx-auto -mt-[52px] max-w-[1240px] px-4 md:px-8">
      <div className="grid gap-2 rounded-[22px] border border-[#e7e1ef] bg-white p-3 shadow-[0_20px_55px_-22px_rgba(66,38,99,.28)] sm:grid-cols-5 md:p-4">
        {requestHref?<a href={requestHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded-xl bg-[#5b2ca4] px-4 text-[14px] font-black text-white sm:order-first"><CalendarDays className="h-5 w-5"/>اطلب الخدمة الآن</a>:null}
        <button onClick={()=>setShareOpen(v=>!v)} className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-xl border border-[#ddd4e8] bg-white px-4 text-[14px] font-black"><Share2 className="h-5 w-5"/>مشاركة</button>
        <a href={mapHref||"#"} target={mapHref?"_blank":undefined} className={`inline-flex min-h-[58px] items-center justify-center gap-2 rounded-xl border border-[#ddd4e8] bg-white px-4 text-[14px] font-black ${mapHref?"":"pointer-events-none opacity-40"}`}><MapPin className="h-5 w-5"/>الموقع</a>
        <a href={tel?`tel:${tel}`:"#"} className={`inline-flex min-h-[58px] items-center justify-center gap-2 rounded-xl border border-[#ddd4e8] bg-white px-4 text-[14px] font-black ${tel?"":"pointer-events-none opacity-40"}`}><Phone className="h-5 w-5"/>اتصال</a>
        <a href={wa?`https://wa.me/${wa}`:"#"} target={wa?"_blank":undefined} rel="noreferrer" className={`inline-flex min-h-[58px] items-center justify-center gap-2 rounded-xl border border-[#ddd4e8] bg-white px-4 text-[14px] font-black ${wa?"":"pointer-events-none opacity-40"}`}><MessageCircle className="h-5 w-5"/>واتساب</a>
      </div>
    </div>

    <div className="mx-auto max-w-[1240px] space-y-11 px-4 pb-10 pt-10 md:px-8 md:pt-12">
      {services.length?<section><div className="mb-5 flex items-center justify-between"><h2 className="text-[23px] font-black md:text-[28px]">خدماتنا</h2><span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#5b2ca4]">عرض الكل <ChevronLeft className="h-4 w-4"/></span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.slice(0,4).map((s,i)=>{const icons=[Building2,Wrench,Sparkles,BriefcaseBusiness];const Icon=icons[i%icons.length];return <article key={s.id} className="rounded-[18px] bg-[linear-gradient(135deg,#faf7fe,#f2ecf8)] p-5 shadow-[0_10px_30px_-24px_rgba(64,35,95,.35)] ring-1 ring-[#eee8f4]"><Icon className="h-12 w-12 text-[#5c35a0]" strokeWidth={1.6}/><h3 className="mt-5 text-[16px] font-black">{s.name}</h3><p className="mt-2 line-clamp-3 min-h-[60px] text-[12px] leading-6 text-[#605967]">{cleanText(s.description)||"خدمة احترافية مقدمة من المنشأة."}</p><span className="mt-4 inline-flex items-center gap-1 text-[12px] font-black text-[#5b2ca4]">المزيد <ChevronLeft className="h-4 w-4"/></span></article>})}</div></section>:null}

      {gallery.length?<section><div className="mb-5 flex items-center justify-between"><h2 className="text-[23px] font-black md:text-[28px]">أعمالنا</h2><span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#5b2ca4]">عرض الكل <ChevronLeft className="h-4 w-4"/></span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{gallery.slice(0,4).map(g=><figure key={g.id} className="relative overflow-hidden rounded-[16px] bg-[#eee9f2]"><img src={httpUrl(g.imageUrl)!} alt={g.caption||business.name} className="aspect-[1.18/1] h-full w-full object-cover"/><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-[12px] font-bold text-white">{g.caption||"من أعمالنا"}</figcaption></figure>)}</div></section>:null}

      <section className="grid gap-4 lg:grid-cols-[1.7fr_.8fr]">
        <div className="rounded-[18px] bg-[linear-gradient(135deg,#faf9fd,#f3eef9)] p-6 ring-1 ring-[#eee7f4] md:p-7"><h2 className="text-[20px] font-black text-[#5d35a0] md:text-[24px]">نبذة عن {business.entityType||"المنشأة"}</h2><p className="mt-4 text-[14px] leading-8 text-[#49434f] md:text-[15px]">{about}</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#ded5e8] pt-5 sm:grid-cols-4"><div className="text-center"><ShieldCheck className="mx-auto h-6 w-6 text-[#5b2ca4]"/><b className="mt-2 block text-[18px]">{business.isVerified?"موثق":"HEE"}</b><span className="text-[10px] text-[#766e7d]">حالة الصفحة</span></div><div className="text-center"><Building2 className="mx-auto h-6 w-6 text-[#5b2ca4]"/><b className="mt-2 block text-[18px]">{branches.length}</b><span className="text-[10px] text-[#766e7d]">فروع</span></div><div className="text-center"><BriefcaseBusiness className="mx-auto h-6 w-6 text-[#5b2ca4]"/><b className="mt-2 block text-[18px]">{services.length}</b><span className="text-[10px] text-[#766e7d]">خدمات</span></div><div className="text-center"><UsersRound className="mx-auto h-6 w-6 text-[#5b2ca4]"/><b className="mt-2 block text-[18px]">{contacts.length}</b><span className="text-[10px] text-[#766e7d]">جهات تواصل</span></div></div></div>
        <div className="flex flex-col justify-between rounded-[18px] bg-[linear-gradient(145deg,#6c34b2,#3d176f)] p-6 text-white shadow-[0_18px_50px_-30px_rgba(61,23,111,.7)]"><div className="flex items-center gap-4"><span className="grid h-20 w-16 place-items-center rounded-xl bg-white text-[#5b2ca4]"><FileText className="h-9 w-9"/></span><div><h3 className="text-[18px] font-black">الملف التعريفي<br/>للشركة</h3><p className="mt-2 text-[11px] leading-5 text-white/75">تعرف على خدماتنا وخبراتنا</p></div></div>{profile?<a href={profile} target="_blank" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-white text-[13px] font-black text-[#51278e]">عرض الملف</a>:<span className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-white/12 text-[12px] font-bold text-white/65">لم تتم إضافة ملف بعد</span>}</div>
      </section>

      <section><h2 className="mb-4 text-[23px] font-black md:text-[28px]">فروعنا</h2><div className="overflow-hidden rounded-[16px] border border-[#e5ddec] bg-[linear-gradient(135deg,#fcfbfd,#f6f2fa)]"><button onClick={()=>setBranchesOpen(v=>!v)} className="flex w-full items-center justify-between px-5 py-4 text-right"><span className="inline-flex items-center gap-3"><MapPin className="h-5 w-5 text-[#5b2ca4]"/><span><b className="block text-[13px]">عرض جميع الفروع</b><small className="mt-1 block text-[10px] text-[#756e7a]">{branches.length?`${branches.length} فروع`:"لم تُضف فروع بعد"}</small></span></span><ChevronDown className={`h-5 w-5 text-[#5b2ca4] transition ${branchesOpen?"rotate-180":""}`}/></button>{branchesOpen&&branches.length?<div className="grid gap-2 border-t border-[#e8e1ee] p-4 md:grid-cols-2">{branches.map(b=><article key={b.id} className="rounded-xl bg-white p-4 ring-1 ring-[#eee8f4]"><b className="text-[13px]">{b.name}</b><p className="mt-1 text-[11px] leading-5 text-[#6f6874]">{[cleanText(b.address),cleanText(b.district),cleanText(b.city)].filter(Boolean).join("، ")||"تفاصيل الموقع غير مضافة"}</p></article>)}</div>:null}</div></section>

      {contacts.length?<section><h2 className="mb-5 text-[23px] font-black md:text-[28px]">تواصل مع فريقنا</h2><div className="grid gap-4 md:grid-cols-2">{contacts.slice(0,4).map(c=><article key={c.id} className="flex items-center gap-4 rounded-[18px] bg-[linear-gradient(135deg,#faf8fd,#f3eef9)] p-4 ring-1 ring-[#eee7f4]"><div className="grid h-[86px] w-[86px] shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-4 ring-white">{c.image?<img src={c.image} alt={c.name} className="h-full w-full object-cover"/>:<UserRound className="h-9 w-9 text-[#6540a2]"/>}</div><div className="min-w-0 flex-1"><h3 className="truncate text-[16px] font-black">{c.name}</h3><p className="mt-1 truncate text-[11px] text-[#706878]">{cleanText(c.jobTitle)||c.department}</p><div className="mt-3 flex flex-wrap gap-2">{c.w?<a href={`https://wa.me/${c.w}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#83c89b] bg-white px-3 text-[11px] font-bold text-[#299452]"><MessageCircle className="h-4 w-4"/>واتساب</a>:null}{c.p?<a href={`tel:${c.p}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d9cce7] bg-white px-3 text-[11px] font-bold text-[#5b2ca4]"><Phone className="h-4 w-4"/>اتصال</a>:null}</div></div></article>)}</div></section>:null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[18px] bg-[linear-gradient(135deg,#faf8fd,#f3eef9)] p-5 ring-1 ring-[#eee7f4]"><div className="flex items-center justify-between"><h3 className="text-[16px] font-black">تواصل سريع</h3><Mail className="h-5 w-5 text-[#5b2ca4]"/></div><p className="mt-4 text-[12px] leading-6 text-[#59515f]">للاستفسارات والتواصل المباشر مع المنشأة.</p>{wa?<a href={`https://wa.me/${wa}`} target="_blank" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#82ca9b] bg-white text-[12px] font-black text-[#299452]"><MessageCircle className="h-4 w-4"/>راسلنا الآن</a>:email?<a href={`mailto:${email}`} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cee3] bg-white text-[12px] font-black text-[#5b2ca4]"><AtSign className="h-4 w-4"/>أرسل بريدًا</a>:null}</div>
        <div className="rounded-[18px] bg-[linear-gradient(135deg,#faf8fd,#f3eef9)] p-5 ring-1 ring-[#eee7f4]"><div className="flex items-center justify-between"><h3 className="text-[16px] font-black">ساعات العمل</h3><Clock3 className="h-5 w-5 text-[#5b2ca4]"/></div><p className="mt-5 text-[13px] font-bold leading-7">{hours||"لم تتم إضافة ساعات العمل بعد"}</p><span className="mt-4 inline-flex rounded-lg bg-[#dff2df] px-3 py-1.5 text-[11px] font-bold text-[#278a49]">مفتوح الآن</span></div>
        <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#faf8fd,#f3eef9)] ring-1 ring-[#eee7f4]"><div className="relative h-32 bg-[linear-gradient(135deg,#e8e1f1,#d9cbe8)]"><div className="absolute inset-0 grid place-items-center"><MapPin className="h-12 w-12 text-[#5b2ca4]"/></div></div><div className="p-5"><h3 className="text-[16px] font-black">موقعنا</h3><p className="mt-2 text-[11px] leading-6 text-[#655e69]">{[cleanText(business.address),location].filter(Boolean).join("، ")||"لم تتم إضافة تفاصيل الموقع بعد"}</p>{mapHref?<a href={mapHref} target="_blank" className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#5b2ca4]">الاتجاهات على الخريطة <ChevronLeft className="h-4 w-4"/></a>:null}</div></div>
      </section>
    </div>

    <footer className="border-t border-[#eee9f2] bg-[#fbfafc]">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-5 px-5 py-6 text-center md:flex-row md:px-8 md:text-right">
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">{socialLinks.map((href,i)=><a key={href} href={href} target="_blank" rel="noreferrer" aria-label={`رابط اجتماعي ${i+1}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#ded7e6] bg-white text-[#554d5c]"><ExternalLink className="h-4 w-4"/></a>)}{website?<a href={website} target="_blank" className="grid h-9 w-9 place-items-center rounded-full border border-[#ded7e6] bg-white text-[#554d5c]"><Globe2 className="h-4 w-4"/></a>:null}</div>
        <div><div className="text-[24px] font-black tracking-[-.08em] text-[#6540a2]">HEE</div><p className="mt-1 text-[10px] text-[#766f7b]">صفحة أعمال رقمية موحدة</p></div>
        <a href="https://hee.sa" className="inline-flex items-center gap-1 text-[12px] font-black text-[#5b2ca4]">أنشئ صفحتك على HEE <ChevronLeft className="h-4 w-4"/></a>
      </div>
    </footer>
  </main>;
}
