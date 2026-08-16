"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import { Building2, Check, ChevronDown, Clock3, Copy, ExternalLink, FileText, Globe2, Mail, MapPin, MessageCircle, Phone, Share2, Store, Users } from "lucide-react";

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

const digits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");
function url(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; }
}
function dayLabel(day: number) { return ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][day] ?? ""; }
function socialLabel(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return "Instagram";
  if (p.includes("tiktok")) return "TikTok";
  if (p.includes("snapchat")) return "Snapchat";
  if (p === "x" || p.includes("twitter")) return "X";
  if (p.includes("facebook")) return "Facebook";
  return platform;
}

export function PublicBusinessPageV4({ business, qrDataUrl, publicUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const whatsapp = digits(business.whatsapp);
  const phone = String(business.phone ?? "").trim();
  const mapHref = url(business.googleMapsLink) || (business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address,business.city].filter(Boolean).join(" "))}` : null);
  const website = url(business.website);
  const profile = url(business.companyProfileUrl);
  const services = business.services.filter((x) => x.isActive).slice(0, 6);
  const gallery = business.galleryItems.filter((x) => x.isActive).slice(0, 6);
  const branches = business.branches.filter((x) => x.isActive);
  const hours = [...business.openingHours].sort((a,b) => a.dayOfWeek - b.dayOfWeek);
  const departments = useMemo(() => business.departments.filter((d) => d.isActive).map((d) => ({...d, contacts:d.contacts.filter((c) => c.isActive && c.name.trim())})).filter((d) => d.contacts.length), [business.departments]);
  const socials = [
    ...(business.instagramUrl ? [{platform:"instagram",url:business.instagramUrl}] : []),
    ...(business.tiktokUrl ? [{platform:"tiktok",url:business.tiktokUrl}] : []),
    ...(business.snapchatUrl ? [{platform:"snapchat",url:business.snapchatUrl}] : []),
    ...(business.xUrl ? [{platform:"x",url:business.xUrl}] : []),
    ...(business.facebookUrl ? [{platform:"facebook",url:business.facebookUrl}] : []),
    ...business.socialLinks.filter((x) => x.isActive).map((x) => ({platform:x.platform,url:x.url})),
  ].filter((x,i,a) => a.findIndex((y) => y.url === x.url) === i);

  const description = String(business.description ?? "").trim();
  const usefulDescription = description && description !== business.name.trim() ? description : null;
  const locationText = [business.city,business.district].filter(Boolean).join("، ");
  const copy = async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} };
  const action = "flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[20px] border border-[#dfe9e4] bg-white text-[10px] font-black text-[#24332e] shadow-[0_12px_28px_-24px_rgba(4,54,43,.42)] transition active:scale-[.97] hover:border-emerald-200 hover:bg-[#f8fcfa]";
  const icon = "grid h-9 w-9 place-items-center rounded-full bg-[#edf8f3] text-[#0c9368]";

  return <main dir="rtl" data-renderer="hee-v4-native-business-profile" className="min-h-screen bg-[#f3f7f5] text-[#10201b]">
    <div className="mx-auto w-full max-w-[1120px] pb-32 md:px-8 md:pb-12 md:pt-8">
      <header className="relative overflow-hidden bg-[linear-gradient(155deg,#063f34_0%,#08624e_58%,#0a8a63_100%)] px-5 pb-7 pt-5 text-white shadow-[0_30px_70px_-45px_rgba(4,54,43,.9)] md:rounded-[36px] md:px-9 md:pb-9 md:pt-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black tracking-wide">HEE · صفحة أعمال ذكية</span>
          <button onClick={() => setShareOpen((v) => !v)} aria-label="مشاركة الصفحة" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur"><Share2 className="h-[17px] w-[17px]" /></button>
        </div>
        <div className="relative mt-7 flex flex-col items-center text-center md:flex-row md:items-center md:text-right">
          <div className="grid h-[94px] w-[94px] shrink-0 place-items-center overflow-hidden rounded-[28px] border border-white/30 bg-white text-[#087653] shadow-[0_18px_50px_-28px_rgba(0,0,0,.65)] ring-4 ring-white/10 md:h-[116px] md:w-[116px] md:rounded-[32px]">
            {business.logoUrl ? <Image src={business.logoUrl} alt={business.name} width={124} height={124} unoptimized className="h-full w-full object-contain p-1" /> : <span className="text-4xl font-black">{business.name.charAt(0)}</span>}
          </div>
          <div className="mt-4 min-w-0 md:mr-6 md:mt-0">
            <div className="flex items-center justify-center gap-2 md:justify-start"><h1 className="text-[24px] font-black leading-tight tracking-[-.03em] md:text-[34px]">{business.name}</h1>{business.isVerified ? <span title="موثق لدى HEE" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#087653]"><Check className="h-4 w-4 stroke-[3]" /></span> : null}</div>
            {business.businessType ? <p className="mt-2 text-[11px] font-bold text-emerald-50/90 md:text-[13px]">{business.businessType}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[9px] font-black"><span className="h-1.5 w-1.5 rounded-full bg-[#6ee7b7]" /> صفحة نشطة</span>
              {locationText ? <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-bold"><MapPin className="h-3 w-3" />{locationText}</span> : null}
            </div>
            {business.shortDescription ? <p className="mx-auto mt-4 max-w-[680px] text-[11px] leading-6 text-white/75 md:mx-0 md:text-[13px]">{business.shortDescription}</p> : null}
          </div>
        </div>
        {shareOpen ? <div className="relative mt-5 flex items-center gap-3 rounded-[20px] border border-white/15 bg-white/10 p-3 backdrop-blur"><img src={qrDataUrl} alt="رمز QR" className="h-14 w-14 rounded-xl bg-white p-1"/><div className="min-w-0 flex-1"><div className="truncate text-[9px] text-white/70">{publicUrl}</div><button onClick={copy} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[9px] font-black text-[#087653]"><Copy className="h-3.5 w-3.5"/>{copied ? "تم النسخ" : "نسخ الرابط"}</button></div></div> : null}
      </header>

      <section className="relative z-10 -mt-4 mx-3 rounded-[26px] border border-[#dfe9e4] bg-white p-3 shadow-[0_24px_55px_-38px_rgba(4,54,43,.55)] md:mx-8 md:-mt-5 md:p-4">
        <div className="grid grid-cols-4 gap-2">
          {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer noopener" className={action}><span className={icon}><MessageCircle className="h-[18px] w-[18px]"/></span>واتساب</a> : null}
          {phone ? <a href={`tel:${phone}`} className={action}><span className={icon}><Phone className="h-[18px] w-[18px]"/></span>اتصال</a> : null}
          {mapHref ? <a href={mapHref} target="_blank" rel="noreferrer noopener" className={action}><span className={icon}><MapPin className="h-[18px] w-[18px]"/></span>الموقع</a> : null}
          {departments.length ? <button onClick={() => document.getElementById("hee-contact-directory")?.scrollIntoView({behavior:"smooth"})} className={action}><span className={icon}><Users className="h-[18px] w-[18px]"/></span>التواصل</button> : null}
        </div>
        {(website || profile) ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{website ? <a href={website} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-[18px] bg-[#f1f8f5] px-4 py-3 text-[10px] font-black text-[#087653]"><span className="inline-flex items-center gap-2">{business.digitalDestinationType === "store" ? <Store className="h-4 w-4"/> : <Globe2 className="h-4 w-4"/>}{business.digitalDestinationType === "store" ? "زيارة المتجر" : "زيارة الموقع"}</span><ExternalLink className="h-3.5 w-3.5"/></a> : null}{profile ? <a href={profile} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-[18px] bg-[#f7f8f7] px-4 py-3 text-[10px] font-black text-slate-700"><span className="inline-flex items-center gap-2"><FileText className="h-4 w-4"/>{business.companyProfileTitle?.trim() || "الملف التعريفي"}</span><ExternalLink className="h-3.5 w-3.5"/></a> : null}</div> : null}
      </section>

      <div className="mx-3 mt-3 space-y-3 md:mx-8 md:mt-5 md:space-y-4">
        {socials.length ? <section className="overflow-x-auto rounded-[20px] border border-[#e2eae6] bg-white px-3 py-3"><div className="flex min-w-max items-center gap-2"><span className="ml-1 text-[9px] font-black text-slate-400">تابعنا</span>{socials.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="rounded-full bg-[#f3f7f5] px-3 py-2 text-[9px] font-black text-slate-600">{socialLabel(s.platform)}</a>)}</div></section> : null}

        {usefulDescription ? <section id="hee-about" className="rounded-[24px] border border-[#e2eae6] bg-white p-5"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#edf8f3] text-[#0c9368]"><Building2 className="h-[18px] w-[18px]"/></span><div><p className="text-[8px] font-black text-[#0c9368]">تعرف علينا</p><h2 className="text-[16px] font-black">عن المنشأة</h2></div></div><p className="mt-4 text-[11px] leading-7 text-slate-600 md:text-[13px]">{usefulDescription}</p></section> : null}

        {services.length ? <section className="rounded-[24px] border border-[#e2eae6] bg-white p-4"><h2 className="text-[16px] font-black">الخدمات</h2><p className="mt-1 text-[9px] text-slate-400">أبرز ما تقدمه المنشأة</p><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">{services.map((s) => <article key={s.id} className="rounded-[18px] border border-[#e6ece9] bg-[#fafcfb] p-3.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#edf8f3] text-[#0c9368]"><Check className="h-4 w-4"/></span><h3 className="mt-3 text-[10px] font-black leading-5">{s.name}</h3></article>)}</div></section> : null}

        {gallery.length ? <section className="rounded-[24px] border border-[#e2eae6] bg-white p-4"><h2 className="text-[16px] font-black">أعمالنا</h2><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">{gallery.map((g) => <figure key={g.id} className="relative aspect-[1.25/1] overflow-hidden rounded-[18px] bg-slate-100"><Image src={g.imageUrl} alt={g.caption || business.name} fill unoptimized className="object-cover"/></figure>)}</div></section> : null}

        {departments.length ? <section id="hee-contact-directory" className="scroll-mt-4 rounded-[24px] border border-[#e2eae6] bg-white p-4"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#edf8f3] text-[#0c9368]"><Users className="h-[18px] w-[18px]"/></span><div><p className="text-[8px] font-black text-[#0c9368]">تواصل مباشرة</p><h2 className="text-[16px] font-black">الجهة المناسبة</h2></div></div><div className="mt-4 space-y-3">{departments.map((d) => <div key={d.id}>{departments.length > 1 ? <h3 className="mb-2 text-[10px] font-black text-slate-500">{d.name}</h3> : null}<div className="space-y-2">{d.contacts.map((c) => { const cp=String(c.phone ?? "").trim(); const cw=digits(c.whatsapp); return <article key={c.id} className="flex items-center gap-3 rounded-[18px] border border-[#e5ece8] bg-[#fbfdfc] p-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-[#eaf6f1] font-black text-[#087653]">{c.imageUrl ? <Image src={c.imageUrl} alt={c.name} width={44} height={44} unoptimized className="h-full w-full object-cover"/> : c.name.charAt(0)}</div><div className="min-w-0 flex-1"><h4 className="truncate text-[11px] font-black">{c.name}</h4>{c.jobTitle ? <p className="mt-0.5 truncate text-[8.5px] text-slate-400">{c.jobTitle}</p> : null}</div><div className="flex gap-1">{cw ? <a href={`https://wa.me/${cw}`} target="_blank" rel="noreferrer noopener" className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-4 w-4"/></a> : null}{cp ? <a href={`tel:${cp}`} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Phone className="h-4 w-4"/></a> : null}{c.email ? <a href={`mailto:${c.email}`} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Mail className="h-4 w-4"/></a> : null}</div></article>})}</div></div>)}</div></section> : null}

        {(branches.length || hours.length) ? <section className="overflow-hidden rounded-[24px] border border-[#e2eae6] bg-white"><div className="divide-y divide-[#e8eeeb]">{branches.length ? <div><button onClick={() => setBranchesOpen((v)=>!v)} className="flex w-full items-center justify-between p-4 text-right"><span className="inline-flex items-center gap-2 text-[12px] font-black"><MapPin className="h-4 w-4 text-[#0c9368]"/>فروعنا <span className="rounded-full bg-[#edf8f3] px-2 py-1 text-[8px] text-[#0c9368]">{branches.length}</span></span><ChevronDown className={`h-4 w-4 transition ${branchesOpen ? "rotate-180" : ""}`}/></button>{branchesOpen ? <div className="space-y-2 px-4 pb-4">{branches.map((b)=><article key={b.id} className="rounded-[16px] bg-[#f7faf8] p-3"><div className="flex items-center justify-between"><h3 className="text-[10px] font-black">{b.name}</h3>{b.isMain ? <span className="text-[8px] font-black text-[#0c9368]">الفرع الرئيسي</span> : null}</div>{[b.city,b.district,b.address].filter(Boolean).length ? <p className="mt-1.5 text-[8.5px] leading-5 text-slate-500">{[b.city,b.district,b.address].filter(Boolean).join("، ")}</p> : null}</article>)}</div> : null}</div> : null}{hours.length ? <div><button onClick={() => setHoursOpen((v)=>!v)} className="flex w-full items-center justify-between p-4 text-right"><span className="inline-flex items-center gap-2 text-[12px] font-black"><Clock3 className="h-4 w-4 text-[#0c9368]"/>ساعات العمل</span><ChevronDown className={`h-4 w-4 transition ${hoursOpen ? "rotate-180" : ""}`}/></button>{hoursOpen ? <div className="grid gap-1 px-4 pb-4 sm:grid-cols-2">{hours.map((h)=><div key={h.id} className="flex items-center justify-between rounded-xl bg-[#f7faf8] px-3 py-2 text-[9px]"><span className="font-black">{dayLabel(h.dayOfWeek)}</span><span className="text-slate-500">{h.isClosed ? "مغلق" : [h.opensAt,h.closesAt].filter(Boolean).join(" — ")}</span></div>)}</div> : null}</div> : null}</div></section> : null}
      </div>
      <div className="mt-6 text-center text-[8px] font-bold text-slate-400">HEE · صفحتك، أعمالك، في مكان واحد</div>
    </div>
  </main>;
}
