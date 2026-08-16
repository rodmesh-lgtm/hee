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

type Props = {
  business: BusinessPublicPayload;
  qrDataUrl: string;
  publicUrl: string;
};

const digits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");
const validPhone = (value?: string | null) => {
  const valueDigits = digits(value);
  return valueDigits.length >= 8 && valueDigits.length <= 15 ? valueDigits : null;
};
const validEmail = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : null;
};
const validHttpUrl = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
  const logo = validHttpUrl(business.logoUrl);
  const profileUrl = validHttpUrl(business.companyProfileUrl);
  const storeUrl = validHttpUrl(business.website);
  const location = [usefulText(business.city), usefulText(business.district)].filter(Boolean).join("، ");
  const hours = usefulText(business.workingHours) || (() => {
    const item = business.openingHours.find((entry) => !entry.isClosed && entry.opensAt && entry.closesAt);
    return item ? `${item.opensAt} - ${item.closesAt}` : null;
  })();

  const services = business.services.filter((item) => item.isActive && usefulText(item.name));
  const branches = business.branches.filter((item) => item.isActive && usefulText(item.name));
  const contacts = useMemo(
    () =>
      business.departments
        .filter((department) => department.isActive)
        .flatMap((department) =>
          department.contacts
            .filter((contact) => contact.isActive && usefulText(contact.name))
            .map((contact) => ({
              ...contact,
              departmentName: department.name,
              safePhone: validPhone(contact.phone),
              safeWhatsapp: validPhone(contact.whatsapp),
              safeEmail: validEmail(contact.email),
            }))
        )
        .filter((contact) => contact.safePhone || contact.safeWhatsapp || contact.safeEmail),
    [business.departments]
  );

  const description = usefulText(business.shortDescription) || usefulText(business.description);
  const aboutText = description && description !== business.name.trim()
    ? description
    : `${business.name} — الصفحة الرسمية للمنشأة على HEE، وتجمع أهم معلومات النشاط وطرق التواصل في مكان واحد.`;

  const mapHref = validHttpUrl(business.googleMapsLink) ||
    (business.address || business.city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [business.address, business.city, business.district].filter(Boolean).join(" ")
        )}`
      : null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const quickActions = [
    { label: "تواصل", subtitle: "تواصل معنا", href: "#hee-contact-directory", icon: UserRound, enabled: true, tone: "text-[#5a2b91]" },
    { label: "الموقع", subtitle: "اعرف طريقك إلينا", href: mapHref || "#", icon: MapPin, enabled: Boolean(mapHref), tone: "text-[#5a2b91]" },
    { label: "اتصال", subtitle: "اتصل مباشرة", href: phone ? `tel:${phone}` : "#", icon: Phone, enabled: Boolean(phone), tone: "text-[#5a2b91]" },
    { label: "واتساب", subtitle: "تحدث معنا الآن", href: whatsapp ? `https://wa.me/${whatsapp}` : "#", icon: MessageCircle, enabled: Boolean(whatsapp), tone: "text-[#09a66f]" },
  ];

  return (
    <main dir="rtl" data-renderer="hee-v6-lux-profile" className="min-h-screen bg-[#f6f7f7] pb-28 text-[#171918] md:pb-10 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-[1040px] md:px-6">
        <div className="overflow-hidden bg-white md:rounded-[34px] md:shadow-[0_28px_80px_-48px_rgba(0,47,34,.32)] md:ring-1 md:ring-[#e6ebe8]">
          <section className="relative overflow-hidden bg-[linear-gradient(145deg,#002e25_0%,#004f3c_46%,#006348_100%)] px-5 pb-[78px] pt-5 text-white md:px-12 md:pb-28 md:pt-8">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_70%_10%,rgba(52,211,153,.18),transparent_28%),linear-gradient(120deg,transparent_0%,transparent_43%,rgba(52,211,153,.08)_44%,transparent_68%)]" />
            <div className="pointer-events-none absolute -left-12 bottom-[-70px] h-52 w-[135%] -rotate-6 rounded-[50%] border border-emerald-300/10" />

            <div className="relative flex items-center justify-between">
              <button onClick={() => setShareOpen((value) => !value)} aria-label="مشاركة" className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/5 backdrop-blur transition hover:bg-white/10"><Share2 className="h-4 w-4" /></button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black text-white/90 backdrop-blur">
                <BadgeCheck className="h-4 w-4 text-[#5df1ad]" />
                {business.isVerified ? "موثق لدى HEE" : "صفحة أعمال على HEE"}
              </span>
            </div>

            <div className="relative mx-auto mt-4 grid h-[112px] w-[112px] place-items-center overflow-hidden rounded-full bg-white text-[#087557] shadow-[0_18px_45px_rgba(0,0,0,.24)] ring-4 ring-white/15 md:h-[124px] md:w-[124px]">
              {logo ? <Image src={logo} alt={business.name} width={124} height={124} unoptimized className="h-full w-full object-contain p-2" /> : <span className="text-[44px] font-black">{business.name.charAt(0)}</span>}
            </div>

            <div className="relative text-center">
              <h1 className="mt-5 text-[25px] font-black leading-tight tracking-[-.03em] md:text-[34px]">{business.name}</h1>
              {business.businessType ? <p className="mt-2 text-[11px] font-bold text-white/75 md:text-sm">{business.businessType}</p> : null}
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#19a873]/20 px-3 py-1.5 text-[10px] font-black text-[#62efad] ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-[#35df96]" /> منشأة تعمل بنشاط
              </span>
            </div>

            <div className="relative mx-auto mt-8 grid max-w-[760px] grid-cols-3 divide-x-reverse divide-x divide-white/15 text-center">
              <div className="flex min-h-12 flex-col items-center justify-center gap-1 md:flex-row md:gap-2"><UserRound className="h-4 w-4 text-[#62efad]" /><span className="text-[9px] font-bold md:text-[11px]">صفحة أعمال موحدة</span></div>
              <div className="flex min-h-12 flex-col items-center justify-center gap-1 md:flex-row md:gap-2"><Clock3 className="h-4 w-4 text-[#62efad]" /><span className="text-[9px] font-bold md:text-[11px]">{hours || "ساعات العمل"}</span></div>
              <div className="flex min-h-12 flex-col items-center justify-center gap-1 md:flex-row md:gap-2"><MapPin className="h-4 w-4 text-[#62efad]" /><span className="max-w-[110px] truncate text-[9px] font-bold md:max-w-[220px] md:text-[11px]">{location || "الموقع"}</span></div>
            </div>

            {shareOpen ? <div className="relative mx-auto mt-5 flex max-w-[520px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur-xl"><img src={qrDataUrl} alt="QR" className="h-14 w-14 rounded-xl bg-white p-1" /><div className="min-w-0 flex-1"><p className="truncate text-[8px] text-white/65">{publicUrl}</p><button onClick={copyLink} className="mt-2 text-[9px] font-black text-[#6ff0b2]">{copied ? "تم النسخ" : "نسخ الرابط"}</button></div></div> : null}
          </section>

          <section className="relative z-10 -mt-[52px] px-4 md:-mt-[58px] md:px-12">
            <div className="grid grid-cols-4 overflow-hidden rounded-[22px] border border-[#e8ecea] bg-white p-2 shadow-[0_16px_38px_-26px_rgba(0,52,37,.4)] md:rounded-[24px] md:p-3">
              {quickActions.map(({ label, subtitle, href, icon: Icon, enabled, tone }) => (
                <a key={label} href={enabled ? href : "#"} target={enabled && href.startsWith("http") ? "_blank" : undefined} rel={enabled && href.startsWith("http") ? "noreferrer noopener" : undefined} aria-disabled={!enabled} className={`group flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-[16px] text-center transition md:min-h-[92px] ${enabled ? "hover:bg-[#f8faf9]" : "pointer-events-none opacity-35"}`}>
                  <Icon className={`h-7 w-7 md:h-8 md:w-8 ${tone}`} strokeWidth={2} />
                  <span className="text-[10px] font-black md:text-[12px]">{label}</span>
                  <span className="hidden text-[8px] text-[#8b9390] sm:block md:text-[9px]">{subtitle}</span>
                </a>
              ))}
            </div>
          </section>

          <div className="space-y-3 px-4 pb-7 pt-4 md:grid md:grid-cols-12 md:gap-4 md:space-y-0 md:px-12 md:pb-10 md:pt-5">
            {(profileUrl || storeUrl) ? <section className="grid grid-cols-2 divide-x-reverse divide-x divide-[#e8ecea] rounded-[20px] bg-[#f8faf9] p-2 ring-1 ring-[#edf1ef] md:col-span-12">
              <div className="min-h-[70px]">{profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer noopener" className="flex h-full items-center justify-center gap-3 p-2"><FileText className="h-7 w-7 text-[#079b68]" /><div><p className="text-[10px] font-black md:text-[12px]">الملف التعريفي</p><p className="mt-1 text-[8px] text-gray-500 md:text-[9px]">عن المنشأة وفريق العمل</p></div></a> : null}</div>
              <div className="min-h-[70px]">{storeUrl ? <a href={storeUrl} target="_blank" rel="noreferrer noopener" className="flex h-full items-center justify-center gap-3 p-2"><ShoppingBag className="h-7 w-7 text-[#079b68]" /><div><p className="text-[10px] font-black md:text-[12px]">المتجر الإلكتروني</p><p className="mt-1 text-[8px] text-gray-500 md:text-[9px]">تسوّق خدماتنا</p></div></a> : null}</div>
            </section> : null}

            <section className="relative overflow-hidden rounded-[22px] border border-[#e8ecea] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(0,45,32,.4)] md:col-span-7 md:p-5">
              <div className="pointer-events-none absolute -left-5 bottom-[-22px] h-28 w-28 rounded-full bg-emerald-50 blur-xl" />
              <div className="relative flex items-center justify-between"><h2 className="text-[15px] font-black md:text-lg">عن المنشأة</h2><Building2 className="h-5 w-5 text-[#079b68]" /></div>
              <p className="relative mt-3 text-[11px] leading-7 text-[#68716e] md:text-[13px] md:leading-8">{aboutText}</p>
              <button type="button" className="relative mt-2 inline-flex items-center gap-1 text-[9px] font-black text-[#079b68] md:text-[10px]">عرض المزيد <ChevronDown className="h-3.5 w-3.5" /></button>
            </section>

            <section id="hee-contact-directory" className="rounded-[22px] border border-[#e8ecea] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(0,45,32,.4)] md:col-span-5 md:p-5">
              <div className="flex items-center justify-between"><h2 className="text-[15px] font-black md:text-lg">دليل التواصل</h2><UserRound className="h-5 w-5 text-[#079b68]" /></div>
              <div className="mt-3 overflow-hidden rounded-[15px] border border-[#e8ecea]">
                {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer noopener" className="flex min-h-12 items-center gap-3 border-b border-[#edf0ef] px-3"><MessageCircle className="h-4 w-4 text-[#08a56f]" /><span className="text-[9px] text-gray-600">واتساب</span><span dir="ltr" className="mr-auto text-[10px]">+{whatsapp}</span><ChevronLeft className="h-4 w-4" /></a> : null}
                {phone ? <a href={`tel:${phone}`} className="flex min-h-12 items-center gap-3 border-b border-[#edf0ef] px-3"><Phone className="h-4 w-4 text-[#5a2b91]" /><span className="text-[9px] text-gray-600">اتصال مباشر</span><span dir="ltr" className="mr-auto text-[10px]">+{phone}</span><ChevronLeft className="h-4 w-4" /></a> : null}
                {email ? <a href={`mailto:${email}`} className="flex min-h-12 items-center gap-3 px-3"><Mail className="h-4 w-4 text-[#079b68]" /><span className="text-[9px] text-gray-600">البريد الإلكتروني</span><span dir="ltr" className="mr-auto max-w-[170px] truncate text-[10px]">{email}</span><ChevronLeft className="h-4 w-4" /></a> : null}
                {!whatsapp && !phone && !email && contacts.length ? contacts.slice(0, 3).map((contact) => <div key={contact.id} className="flex min-h-12 items-center gap-3 border-b border-[#edf0ef] px-3 last:border-0"><UserRound className="h-4 w-4 text-[#079b68]" /><div className="min-w-0"><p className="truncate text-[9px] font-black">{contact.name}</p><p className="truncate text-[8px] text-gray-500">{contact.jobTitle || contact.departmentName}</p></div></div>) : null}
              </div>
            </section>

            {services.length ? <section className="rounded-[22px] border border-[#e8ecea] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(0,45,32,.4)] md:col-span-12 md:p-5">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#079b68]" /><h2 className="text-[15px] font-black md:text-lg">خدماتنا</h2></div><span className="text-[9px] font-black text-[#079b68] md:text-[10px]">عرض الكل</span></div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible">
                {services.slice(0, 8).map((service) => {
                  const image = validHttpUrl(service.imageUrl);
                  return <article key={service.id} className="w-[128px] shrink-0 md:w-auto"><div className="grid h-[88px] place-items-center overflow-hidden rounded-[15px] bg-[#eef4f1] md:h-[132px]">{image ? <Image src={image} alt={service.name} width={240} height={150} unoptimized className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" /> : <Sparkles className="h-7 w-7 text-[#079b68]" />}</div><p className="mt-2 line-clamp-2 text-center text-[9px] font-black leading-4 md:text-[11px]">{service.name}</p>{service.description ? <p className="mt-1 line-clamp-1 text-center text-[8px] text-gray-500 md:text-[9px]">{service.description}</p> : null}</article>;
                })}
              </div>
            </section> : null}

            {branches.length ? <section className="overflow-hidden rounded-[22px] border border-[#e8ecea] bg-white shadow-[0_10px_28px_-24px_rgba(0,45,32,.4)] md:col-span-12">
              <button type="button" onClick={() => setBranchesOpen((value) => !value)} className="flex w-full items-center justify-between p-4 md:p-5"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#079b68]" /><h2 className="text-[15px] font-black md:text-lg">فروعنا</h2></div><ChevronDown className={`h-4 w-4 transition ${branchesOpen ? "rotate-180" : ""}`} /></button>
              {branchesOpen ? <div className="border-t border-[#edf0ef] p-3 md:grid md:grid-cols-2 md:gap-3 md:p-4">{branches.map((branch) => {
                const branchMap = validHttpUrl(branch.googleMapsLink) || ([branch.address, branch.city, branch.district].filter(Boolean).length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([branch.address, branch.city, branch.district].filter(Boolean).join(" "))}` : null);
                const card = <div className="flex items-center gap-3 rounded-[16px] bg-[#f8faf9] p-3 md:p-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[#e7f4ee] text-[#079b68]"><MapPin className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black md:text-[12px]">{branch.name}</p><p className="mt-1 truncate text-[8px] text-gray-500 md:text-[9px]">{[branch.city, branch.district, branch.address].filter(Boolean).join("، ") || "تفاصيل الموقع غير متاحة"}</p>{branch.isMain ? <p className="mt-1 text-[8px] font-black text-[#079b68]">الفرع الرئيسي</p> : null}</div>{branchMap ? <ChevronLeft className="h-4 w-4" /> : null}</div>;
                return branchMap ? <a key={branch.id} href={branchMap} target="_blank" rel="noreferrer noopener" className="mb-2 block last:mb-0 md:mb-0">{card}</a> : <div key={branch.id} className="mb-2 last:mb-0 md:mb-0">{card}</div>;
              })}</div> : null}
            </section> : mapHref ? <a href={mapHref} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-[22px] border border-[#e8ecea] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(0,45,32,.4)] md:col-span-12 md:p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#e7f4ee] text-[#079b68]"><MapPin className="h-5 w-5" /></span><div><p className="text-[11px] font-black">موقع المنشأة</p><p className="mt-1 text-[8px] text-gray-500">فتح الموقع على الخريطة</p></div></div><ChevronLeft className="h-4 w-4" /></a> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
