"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  FileText,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  Sparkles,
  UserRound,
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

const digits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");
const validPhone = (value?: string | null) => { const d = digits(value); return d.length >= 8 && d.length <= 15 ? d : null; };
const validEmail = (value?: string | null) => { const raw = String(value ?? "").trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : null; };
const validHttpUrl = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try { const url = new URL(raw); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; } catch { return null; }
};
const usefulText = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  return raw.length >= 2 && /[\p{L}\p{N}]/u.test(raw) ? raw : null;
};

export function PublicBusinessPageV4({ business, qrDataUrl, publicUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(true);
  const whatsapp = validPhone(business.whatsapp);
  const phone = validPhone(business.phone);
  const email = validEmail(business.email);
  const location = [usefulText(business.city), usefulText(business.district)].filter(Boolean).join("، ");
  const hours = usefulText(business.workingHours) || (() => {
    const open = business.openingHours.find((item) => !item.isClosed && item.opensAt && item.closesAt);
    return open ? `${open.opensAt} - ${open.closesAt}` : null;
  })();
  const services = business.services.filter((item) => item.isActive && usefulText(item.name));
  const branches = business.branches.filter((item) => item.isActive && usefulText(item.name));
  const logo = validHttpUrl(business.logoUrl);
  const profileUrl = validHttpUrl(business.companyProfileUrl);
  const storeUrl = validHttpUrl(business.website);

  const contacts = useMemo(() => business.departments
    .filter((department) => department.isActive)
    .flatMap((department) => department.contacts.filter((contact) => contact.isActive && usefulText(contact.name)).map((contact) => ({
      ...contact,
      departmentName: department.name,
      safePhone: validPhone(contact.phone),
      safeWhatsapp: validPhone(contact.whatsapp),
      safeEmail: validEmail(contact.email),
      safeImage: validHttpUrl(contact.imageUrl),
    })))
    .filter((contact) => contact.safePhone || contact.safeWhatsapp || contact.safeEmail), [business.departments]);

  const rawDescription = usefulText(business.shortDescription) || usefulText(business.description);
  const aboutText = rawDescription && rawDescription !== business.name.trim()
    ? rawDescription
    : `${business.name} — الصفحة الرسمية للمنشأة على HEE، وتجمع أهم معلومات النشاط وطرق التواصل في مكان واحد.`;

  const mapHref = validHttpUrl(business.googleMapsLink) || (business.address || business.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address, business.city, business.district].filter(Boolean).join(" "))}` : null);

  const copyLink = async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} };

  return (
    <main dir="rtl" data-renderer="hee-v5-approved-miniapp" className="min-h-screen bg-[#f5f7f6] pb-28 text-[#171b1a] md:py-8">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden bg-white shadow-[0_18px_60px_-38px_rgba(0,55,38,.42)] md:rounded-[34px] md:ring-1 md:ring-[#e3e9e6]">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_15%,#087557_0%,#00563f_42%,#003d2e_100%)] px-5 pb-[78px] pt-5 text-center text-white">
          <div className="pointer-events-none absolute -left-16 top-28 h-52 w-72 rotate-[-25deg] rounded-[50%] bg-emerald-400/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <button onClick={() => setShareOpen((v) => !v)} aria-label="مشاركة" className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/5"><Share2 className="h-4 w-4" /></button>
            {business.isVerified ? <span className="inline-flex items-center gap-1.5 rounded-[14px] border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-black"><BadgeCheck className="h-4 w-4 text-[#3ee39e]" />موثق</span> : <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-bold">HEE • صفحة أعمال ذكية</span>}
          </div>

          <div className="relative mx-auto mt-2 grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-full bg-white text-[#087557] shadow-[0_12px_34px_rgba(0,0,0,.22)] ring-2 ring-white/70">
            {logo ? <Image src={logo} alt={business.name} width={104} height={104} unoptimized className="h-full w-full object-contain p-2" /> : <span className="text-[42px] font-black">{business.name.charAt(0)}</span>}
          </div>
          <h1 className="relative mt-4 text-[24px] font-black leading-tight tracking-[-.025em]">{business.name}</h1>
          {business.businessType ? <p className="relative mt-2 text-[11px] font-semibold text-white/80">{business.businessType}</p> : null}
          <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[#72efb6]"><span className="h-2 w-2 rounded-full bg-[#28d68d]" />منشأة تعمل بنشاط</span>

          <div className="relative mt-7 grid grid-cols-3 divide-x-reverse divide-x divide-white/20 text-[9px]">
            <div className="flex min-h-10 items-center justify-center gap-1.5 px-1"><UserRound className="h-4 w-4 text-[#6ff0a8]" /><span>{business.isVerified ? "منشأة موثقة" : "صفحة أعمال"}</span></div>
            <div className="flex min-h-10 items-center justify-center gap-1.5 px-1"><Clock3 className="h-4 w-4 text-[#6ff0a8]" /><span>{hours || "ساعات العمل"}</span></div>
            <div className="flex min-h-10 items-center justify-center gap-1.5 px-1"><MapPin className="h-4 w-4 text-[#6ff0a8]" /><span>{location || "الموقع"}</span></div>
          </div>

          {shareOpen ? <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-right backdrop-blur"><img src={qrDataUrl} alt="QR" className="h-14 w-14 rounded-lg bg-white p-1" /><div className="min-w-0 flex-1"><p className="truncate text-[8px] text-white/70">{publicUrl}</p><button onClick={copyLink} className="mt-2 text-[9px] font-black text-[#70efb2]">{copied ? "تم النسخ" : "نسخ الرابط"}</button></div></div> : null}
        </section>

        <section className="relative z-10 -mt-[54px] px-5">
          <div className="grid grid-cols-4 rounded-[22px] bg-white p-2 shadow-[0_10px_32px_-18px_rgba(0,45,32,.35)] ring-1 ring-[#e7ece9]">
            <a href="#hee-contact-directory" className="flex h-[72px] flex-col items-center justify-center gap-2 rounded-[16px] text-[10px] font-bold text-[#404846]"><UserRound className="h-6 w-6 text-[#5c2b91]" />التواصل</a>
            <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} className={`flex h-[72px] flex-col items-center justify-center gap-2 rounded-[16px] text-[10px] font-bold ${mapHref ? "text-[#404846]" : "pointer-events-none text-gray-300"}`}><MapPin className="h-6 w-6 text-[#5c2b91]" />الموقع</a>
            <a href={phone ? `tel:${phone}` : "#"} className={`flex h-[72px] flex-col items-center justify-center gap-2 rounded-[16px] text-[10px] font-bold ${phone ? "text-[#404846]" : "pointer-events-none text-gray-300"}`}><Phone className="h-6 w-6 text-[#5c2b91]" />اتصال</a>
            <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer noopener" : undefined} className={`flex h-[72px] flex-col items-center justify-center gap-2 rounded-[16px] text-[10px] font-bold ${whatsapp ? "text-[#404846]" : "pointer-events-none text-gray-300"}`}><MessageCircle className="h-7 w-7 text-[#0aa36d]" />واتساب</a>
          </div>
        </section>

        <div className="space-y-3 px-5 pb-7 pt-4">
          {(profileUrl || storeUrl) ? <section className="grid grid-cols-2 divide-x-reverse divide-x divide-[#e8ecea] rounded-[18px] bg-[#f7faf8] p-2 ring-1 ring-[#edf1ef]">
            {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer noopener" className="flex items-center justify-center gap-3 p-2"><FileText className="h-6 w-6 text-[#079b68]" /><div><p className="text-[10px] font-black">الملف التعريفي</p><p className="mt-1 text-[8px] text-gray-500">عرض الملف التعريفي</p></div></a> : <div />}
            {storeUrl ? <a href={storeUrl} target="_blank" rel="noreferrer noopener" className="flex items-center justify-center gap-3 p-2"><ShoppingBag className="h-6 w-6 text-[#079b68]" /><div><p className="text-[10px] font-black">المتجر الإلكتروني</p><p className="mt-1 text-[8px] text-gray-500">تسوق خدماتنا</p></div></a> : <div />}
          </section> : null}

          <section className="rounded-[20px] border border-[#e8ecea] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(0,45,32,.4)]">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-black">عن المنشأة</h2><Building2 className="h-5 w-5 text-[#079b68]" /></div>
            <p className="mt-3 text-[11px] leading-7 text-[#66706c]">{aboutText}</p>
          </section>

          {services.length ? <section className="rounded-[20px] border border-[#e8ecea] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(0,45,32,.4)]">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="text-[15px] font-black">خدماتنا</h2></div><span className="text-[9px] font-bold text-[#079b68]">عرض الكل</span></div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {services.slice(0, 8).map((service) => { const image = validHttpUrl(service.imageUrl); return <article key={service.id} className="w-[105px] shrink-0"><div className="grid h-[78px] place-items-center overflow-hidden rounded-[14px] bg-[#eef4f1]">{image ? <Image src={image} alt={service.name} width={105} height={78} unoptimized className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6 text-[#079b68]" />}</div><p className="mt-2 line-clamp-2 text-center text-[9px] font-bold leading-4">{service.name}</p></article>; })}
            </div>
          </section> : null}

          <section id="hee-contact-directory" className="rounded-[20px] border border-[#e8ecea] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(0,45,32,.4)]">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-black">دليل التواصل</h2><UserRound className="h-5 w-5" /></div>
            <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e8ecea]">
              {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center gap-3 border-b border-[#edf0ef] px-3"><MessageCircle className="h-4 w-4 text-[#0aa36d]" /><span className="text-[9px] text-gray-600">واتساب</span><span dir="ltr" className="mr-auto text-[10px]">+{whatsapp}</span><ChevronLeft className="h-4 w-4" /></a> : null}
              {phone ? <a href={`tel:${phone}`} className="flex min-h-11 items-center gap-3 border-b border-[#edf0ef] px-3"><Phone className="h-4 w-4 text-[#5c2b91]" /><span className="text-[9px] text-gray-600">اتصال مباشر</span><span dir="ltr" className="mr-auto text-[10px]">+{phone}</span><ChevronLeft className="h-4 w-4" /></a> : null}
              {email ? <a href={`mailto:${email}`} className="flex min-h-11 items-center gap-3 px-3"><Mail className="h-4 w-4 text-[#079b68]" /><span className="text-[9px] text-gray-600">البريد الإلكتروني</span><span dir="ltr" className="mr-auto max-w-[170px] truncate text-[9px]">{email}</span><ChevronLeft className="h-4 w-4" /></a> : null}
              {!whatsapp && !phone && !email && contacts.length ? contacts.slice(0, 3).map((contact) => <div key={contact.id} className="flex min-h-11 items-center gap-3 border-b border-[#edf0ef] px-3 last:border-0"><Headset className="h-4 w-4 text-[#079b68]" /><span className="text-[9px] font-bold">{contact.name}</span><span className="mr-auto text-[8px] text-gray-500">{contact.departmentName}</span></div>) : null}
              {!whatsapp && !phone && !email && !contacts.length ? <div className="p-4 text-center text-[9px] text-gray-400">لم تتم إضافة وسائل التواصل بعد</div> : null}
            </div>
          </section>

          {branches.length ? <section className="overflow-hidden rounded-[20px] border border-[#e8ecea] bg-white shadow-[0_8px_24px_-22px_rgba(0,45,32,.4)]">
            <button type="button" onClick={() => setBranchesOpen((v) => !v)} className="flex w-full items-center justify-between p-4"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#079b68]" /><h2 className="text-[15px] font-black">فروعنا</h2></div><ChevronDown className={`h-4 w-4 transition ${branchesOpen ? "rotate-180" : ""}`} /></button>
            {branchesOpen ? <div className="border-t border-[#edf0ef] p-3">{branches.slice(0, 5).map((branch) => { const branchMap = validHttpUrl(branch.googleMapsLink) || ([branch.address, branch.city, branch.district].filter(Boolean).length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([branch.address, branch.city, branch.district].filter(Boolean).join(" "))}` : null); return <a key={branch.id} href={branchMap || "#"} target={branchMap ? "_blank" : undefined} className={`mb-2 flex items-center gap-3 rounded-[14px] bg-[#f8faf9] p-3 last:mb-0 ${branchMap ? "" : "pointer-events-none"}`}><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e8f4ef] text-[#079b68]"><MapPin className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-black">{branch.name}</p><p className="mt-1 truncate text-[8px] text-gray-500">{[branch.city, branch.district, branch.address].filter(Boolean).join("، ") || "تفاصيل الموقع غير متاحة"}</p>{branch.isMain ? <p className="mt-1 text-[8px] font-bold text-[#079b68]">الفرع الرئيسي</p> : null}</div><ChevronLeft className="h-4 w-4" /></a>; })}</div> : null}
          </section> : null}
        </div>
      </div>
    </main>
  );
}
