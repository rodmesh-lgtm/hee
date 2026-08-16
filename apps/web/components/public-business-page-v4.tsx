"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import {
  BadgeCheck, Building2, ChevronDown, Clock3, Copy, ExternalLink,
  FileText, Globe2, Mail, MapPin, MessageCircle, Phone, Share2,
  Sparkles, Store, Users, Check, Navigation
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

type Props = { business: BusinessPublicPayload; qrDataUrl: string; publicUrl: string };

const digits = (v?: string | null) => String(v ?? "").replace(/\D/g, "");
const safeUrl = (v?: string | null) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; }
};
const days = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function IconButton({ href, label, children, primary=false }: { href?: string | null; label: string; children: React.ReactNode; primary?: boolean }) {
  const cls = `group flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[22px] px-2 py-3.5 transition active:scale-[.97] ${primary ? "bg-[#0a8f67] text-white shadow-[0_12px_28px_-18px_rgba(10,143,103,.9)]" : "bg-[#f5f8f6] text-[#18352d]"}`;
  const body = <><span className={`grid h-10 w-10 place-items-center rounded-[15px] ${primary ? "bg-white/15" : "bg-white text-[#07825e] shadow-sm"}`}>{children}</span><span className="truncate text-[10px] font-black">{label}</span></>;
  return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener" className={cls}>{body}</a> : null;
}

export function PublicBusinessPageV4({ business, qrDataUrl, publicUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const whatsapp = digits(business.whatsapp);
  const phone = String(business.phone ?? "").trim();
  const website = safeUrl(business.website);
  const profile = safeUrl(business.companyProfileUrl);
  const mapHref = safeUrl(business.googleMapsLink) || (business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address,business.city].filter(Boolean).join(" "))}` : null);
  const services = business.services.filter(x => x.isActive).slice(0, 8);
  const gallery = business.galleryItems.filter(x => x.isActive).slice(0, 6);
  const branches = business.branches.filter(x => x.isActive);
  const hours = [...business.openingHours].sort((a,b) => a.dayOfWeek - b.dayOfWeek);
  const departments = useMemo(() => business.departments.filter(d => d.isActive).map(d => ({...d, contacts:d.contacts.filter(c => c.isActive && c.name.trim())})).filter(d => d.contacts.length), [business.departments]);
  const description = String(business.description ?? "").trim();
  const usefulDescription = description && description !== business.name.trim() ? description : null;
  const location = [business.city,business.district].filter(Boolean).join("، ");
  const socials = [
    business.instagramUrl && ["Instagram", business.instagramUrl], business.tiktokUrl && ["TikTok", business.tiktokUrl],
    business.snapchatUrl && ["Snapchat", business.snapchatUrl], business.xUrl && ["X", business.xUrl],
    business.facebookUrl && ["Facebook", business.facebookUrl],
    ...business.socialLinks.filter(x => x.isActive).map(x => [x.platform,x.url])
  ].filter(Boolean) as string[][];

  const copyLink = async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };

  return <main dir="rtl" data-renderer="hee-v4-native-business-profile" className="min-h-screen bg-[#edf3f0] text-[#12251f]">
    <div className="mx-auto min-h-screen w-full max-w-[460px] bg-[#f8faf9] pb-32 shadow-[0_0_80px_-35px_rgba(7,61,48,.35)] md:my-8 md:max-w-[1120px] md:overflow-hidden md:rounded-[40px] md:pb-14">

      {/* Identity canvas */}
      <header className="relative">
        <div className="relative h-[190px] overflow-hidden bg-[linear-gradient(135deg,#052f29_0%,#075947_52%,#0b9b70_100%)] md:h-[250px]">
          {business.coverUrl ? <Image src={business.coverUrl} alt="" fill priority unoptimized className="object-cover opacity-45" /> : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,.16),transparent_32%),linear-gradient(to_top,rgba(3,44,36,.4),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/10 px-3 py-2 text-[9px] font-black text-white backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5"/> HEE</span>
            <button onClick={() => setShareOpen(v => !v)} aria-label="مشاركة" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/10 text-white backdrop-blur-xl"><Share2 className="h-[17px] w-[17px]"/></button>
          </div>
        </div>

        <div className="relative -mt-[58px] px-4 md:-mt-[72px] md:px-8">
          <section className="rounded-[30px] border border-white/80 bg-white/95 px-5 pb-5 pt-[68px] text-center shadow-[0_25px_70px_-42px_rgba(4,54,43,.55)] backdrop-blur-xl md:px-8 md:pb-7 md:pt-[82px]">
            <div className="absolute left-1/2 top-0 grid h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[32px] border-[5px] border-white bg-[#f3f8f5] text-[#087653] shadow-[0_18px_40px_-20px_rgba(4,54,43,.7)] md:h-[136px] md:w-[136px] md:rounded-[38px]">
              {business.logoUrl ? <Image src={business.logoUrl} alt={business.name} width={140} height={140} unoptimized className="h-full w-full object-contain p-1"/> : <span className="text-[42px] font-black">{business.name.charAt(0)}</span>}
            </div>
            <div className="flex items-center justify-center gap-2"><h1 className="text-[23px] font-black leading-tight tracking-[-.035em] md:text-[34px]">{business.name}</h1>{business.isVerified ? <BadgeCheck className="h-6 w-6 fill-[#0a8f67] text-white md:h-7 md:w-7"/> : null}</div>
            {business.businessType ? <p className="mt-2 text-[11px] font-bold text-slate-500 md:text-[13px]">{business.businessType}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f2] px-3 py-1.5 text-[9px] font-black text-[#087653]"><span className="h-1.5 w-1.5 rounded-full bg-[#19b67e]"/> صفحة نشطة</span>
              {location ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-bold text-slate-500"><MapPin className="h-3 w-3"/>{location}</span> : null}
            </div>
            {business.shortDescription ? <p className="mx-auto mt-4 max-w-[620px] text-[11px] leading-6 text-slate-500 md:text-[13px]">{business.shortDescription}</p> : null}
          </section>
        </div>
      </header>

      {/* Primary actions */}
      <section className="px-4 pt-3 md:px-8 md:pt-5">
        <div className="flex gap-2 rounded-[28px] border border-[#e3ebe7] bg-white p-2.5 shadow-[0_18px_45px_-36px_rgba(4,54,43,.6)]">
          <IconButton href={whatsapp ? `https://wa.me/${whatsapp}` : null} label="واتساب" primary><MessageCircle className="h-[19px] w-[19px]"/></IconButton>
          <IconButton href={phone ? `tel:${phone}` : null} label="اتصال"><Phone className="h-[18px] w-[18px]"/></IconButton>
          <IconButton href={mapHref} label="الموقع"><Navigation className="h-[18px] w-[18px]"/></IconButton>
          {departments.length ? <button onClick={() => document.getElementById("hee-contact")?.scrollIntoView({behavior:"smooth"})} className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[22px] bg-[#f5f8f6] px-2 py-3.5 text-[#18352d] active:scale-[.97]"><span className="grid h-10 w-10 place-items-center rounded-[15px] bg-white text-[#07825e] shadow-sm"><Users className="h-[18px] w-[18px]"/></span><span className="text-[10px] font-black">الفريق</span></button> : null}
        </div>
      </section>

      {/* Smart destination strip */}
      {(website || profile || socials.length || shareOpen) ? <section className="px-4 pt-3 md:px-8">
        <div className="rounded-[26px] bg-[#102f28] p-3 text-white md:flex md:items-center md:gap-3">
          <div className="flex gap-2 overflow-x-auto pb-0.5 md:flex-1">
            {website ? <a href={website} target="_blank" rel="noreferrer noopener" className="flex shrink-0 items-center gap-2 rounded-[17px] bg-white/10 px-3.5 py-3 text-[10px] font-black"><span className="grid h-7 w-7 place-items-center rounded-[10px] bg-white/10">{business.digitalDestinationType === "store" ? <Store className="h-4 w-4"/> : <Globe2 className="h-4 w-4"/>}</span>{business.digitalDestinationType === "store" ? "المتجر" : "الموقع"}<ExternalLink className="h-3 w-3 opacity-60"/></a> : null}
            {profile ? <a href={profile} target="_blank" rel="noreferrer noopener" className="flex shrink-0 items-center gap-2 rounded-[17px] bg-white/10 px-3.5 py-3 text-[10px] font-black"><FileText className="h-4 w-4"/>{business.companyProfileTitle?.trim() || "الملف التعريفي"}</a> : null}
            {socials.map((s,i) => <a key={`${s[1]}-${i}`} href={s[1]} target="_blank" rel="noreferrer noopener" className="shrink-0 rounded-[17px] bg-white/10 px-3.5 py-3 text-[10px] font-black">{s[0]}</a>)}
          </div>
          <button onClick={() => setShareOpen(v=>!v)} className="mt-2 hidden shrink-0 rounded-[17px] bg-[#18a979] px-4 py-3 text-[10px] font-black md:inline-flex md:mt-0">مشاركة الصفحة</button>
          {shareOpen ? <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-white/10 p-3 md:mt-0"><img src={qrDataUrl} alt="QR" className="h-12 w-12 rounded-lg bg-white p-1"/><div className="min-w-0 flex-1"><p className="max-w-[190px] truncate text-[8px] text-white/60">{publicUrl}</p><button onClick={copyLink} className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black"><Copy className="h-3 w-3"/>{copied ? "تم النسخ" : "نسخ الرابط"}</button></div></div> : null}
        </div>
      </section> : null}

      <div className="space-y-3 px-4 pt-3 md:grid md:grid-cols-12 md:gap-4 md:space-y-0 md:px-8 md:pt-5">
        <div className="space-y-3 md:col-span-7">
          {usefulDescription ? <section className="rounded-[28px] border border-[#e3ebe7] bg-white p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#eaf8f2] text-[#07825e]"><Building2 className="h-5 w-5"/></span><div><p className="text-[8px] font-black text-[#0a956c]">نبذة سريعة</p><h2 className="text-[17px] font-black">عن المنشأة</h2></div></div><p className="mt-4 text-[11px] leading-7 text-slate-600 md:text-[13px] md:leading-8">{usefulDescription}</p></section> : null}

          {services.length ? <section className="rounded-[28px] border border-[#e3ebe7] bg-white p-4 md:p-6"><div className="flex items-end justify-between"><div><p className="text-[8px] font-black text-[#0a956c]">ماذا نقدم؟</p><h2 className="mt-1 text-[17px] font-black">الخدمات</h2></div><span className="rounded-full bg-[#edf7f3] px-3 py-1.5 text-[9px] font-black text-[#087653]">{services.length} خدمات</span></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-2">{services.map((s,i) => <article key={s.id} className="group min-h-[112px] rounded-[22px] bg-[#f5f8f6] p-4"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-white text-[#0a956c] shadow-sm"><Check className="h-4 w-4 stroke-[3]"/></span><span className="text-[10px] font-black text-slate-300">{String(i+1).padStart(2,"0")}</span></div><h3 className="mt-4 text-[11px] font-black leading-5">{s.name}</h3></article>)}</div></section> : null}

          {gallery.length ? <section className="rounded-[28px] border border-[#e3ebe7] bg-white p-4 md:p-6"><p className="text-[8px] font-black text-[#0a956c]">من أعمالنا</p><h2 className="mt-1 text-[17px] font-black">معرض الأعمال</h2><div className="mt-4 grid grid-cols-2 gap-2">{gallery.map((g,i) => <figure key={g.id} className={`relative overflow-hidden rounded-[20px] bg-slate-100 ${i===0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}><Image src={g.imageUrl} alt={g.caption || business.name} fill unoptimized className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"/></figure>)}</div></section> : null}
        </div>

        <aside className="mt-3 space-y-3 md:col-span-5 md:mt-0">
          {departments.length ? <section id="hee-contact" className="scroll-mt-4 rounded-[28px] border border-[#e3ebe7] bg-white p-4 md:p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#eaf8f2] text-[#07825e]"><Users className="h-5 w-5"/></span><div><p className="text-[8px] font-black text-[#0a956c]">وصول مباشر</p><h2 className="text-[17px] font-black">تواصل مع الجهة المناسبة</h2></div></div><div className="mt-4 space-y-3">{departments.map(d => <div key={d.id}>{departments.length > 1 ? <p className="mb-2 text-[9px] font-black text-slate-400">{d.name}</p> : null}<div className="space-y-2">{d.contacts.map(c => { const cp=String(c.phone ?? "").trim(); const cw=digits(c.whatsapp); return <article key={c.id} className="flex items-center gap-3 rounded-[20px] bg-[#f5f8f6] p-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-white font-black text-[#087653] shadow-sm">{c.imageUrl ? <Image src={c.imageUrl} alt={c.name} width={48} height={48} unoptimized className="h-full w-full object-cover"/> : c.name.charAt(0)}</div><div className="min-w-0 flex-1"><h3 className="truncate text-[11px] font-black">{c.name}</h3>{c.jobTitle ? <p className="mt-1 truncate text-[8px] text-slate-400">{c.jobTitle}</p> : null}</div><div className="flex gap-1.5">{cw ? <a href={`https://wa.me/${cw}`} target="_blank" rel="noreferrer noopener" className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#0a956c] text-white"><MessageCircle className="h-4 w-4"/></a> : null}{cp ? <a href={`tel:${cp}`} className="grid h-9 w-9 place-items-center rounded-[12px] bg-white text-[#087653]"><Phone className="h-4 w-4"/></a> : null}{c.email ? <a href={`mailto:${c.email}`} className="grid h-9 w-9 place-items-center rounded-[12px] bg-white text-slate-500"><Mail className="h-4 w-4"/></a> : null}</div></article>})}</div></div>)}</div></section> : null}

          {(branches.length || hours.length) ? <section className="overflow-hidden rounded-[28px] border border-[#e3ebe7] bg-white"><div className="divide-y divide-[#edf1ef]">{branches.length ? <div><button onClick={()=>setBranchesOpen(v=>!v)} className="flex w-full items-center justify-between p-4 text-right"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#eaf8f2] text-[#07825e]"><MapPin className="h-[18px] w-[18px]"/></span><span><span className="block text-[12px] font-black">الفروع</span><span className="mt-0.5 block text-[8px] text-slate-400">{branches.length} {branches.length===1 ? "فرع" : "فروع"}</span></span></span><ChevronDown className={`h-4 w-4 transition ${branchesOpen ? "rotate-180" : ""}`}/></button>{branchesOpen ? <div className="space-y-2 px-4 pb-4">{branches.map(b => <article key={b.id} className="rounded-[18px] bg-[#f5f8f6] p-3.5"><div className="flex justify-between gap-3"><h3 className="text-[10px] font-black">{b.name}</h3>{b.isMain ? <span className="shrink-0 text-[8px] font-black text-[#0a956c]">الرئيسي</span> : null}</div>{[b.city,b.district,b.address].filter(Boolean).length ? <p className="mt-2 text-[8.5px] leading-5 text-slate-500">{[b.city,b.district,b.address].filter(Boolean).join("، ")}</p> : null}</article>)}</div> : null}</div> : null}{hours.length ? <div><button onClick={()=>setHoursOpen(v=>!v)} className="flex w-full items-center justify-between p-4 text-right"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#eaf8f2] text-[#07825e]"><Clock3 className="h-[18px] w-[18px]"/></span><span className="text-[12px] font-black">ساعات العمل</span></span><ChevronDown className={`h-4 w-4 transition ${hoursOpen ? "rotate-180" : ""}`}/></button>{hoursOpen ? <div className="grid gap-1.5 px-4 pb-4">{hours.map(h => <div key={h.id} className="flex items-center justify-between rounded-[14px] bg-[#f5f8f6] px-3 py-2.5 text-[9px]"><span className="font-black">{days[h.dayOfWeek]}</span><span className="text-slate-500">{h.isClosed ? "مغلق" : [h.opensAt,h.closesAt].filter(Boolean).join(" — ")}</span></div>)}</div> : null}</div> : null}</div></section> : null}
        </aside>
      </div>

      <footer className="mt-7 px-4 text-center md:px-8"><div className="rounded-[22px] border border-[#e3ebe7] bg-white px-4 py-4 text-[8px] font-bold text-slate-400">HEE · صفحة أعمال ذكية تجمع هوية المنشأة وخدماتها وطرق التواصل في مكان واحد</div></footer>
    </div>
  </main>;
}
