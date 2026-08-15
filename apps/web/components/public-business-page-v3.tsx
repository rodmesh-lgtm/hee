"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Store,
  Users,
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
    departments: {
      include: {
        contacts: {
          include: {
            branch: true;
          };
        };
      };
    };
  };
}>;

type Props = {
  business: BusinessPublicPayload;
  qrDataUrl: string;
  publicUrl: string;
};

function normalizeHttpUrl(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function compactName(name: string) {
  const cleaned = name
    .replace(/^مؤسسة\s+/u, "")
    .replace(/^شركة\s+/u, "")
    .replace(/\s+ذات مسؤولية محدودة$/u, "")
    .trim();
  return cleaned.length <= 30 ? cleaned : `${cleaned.slice(0, 29).trim()}…`;
}

function socialLabel(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return "Instagram";
  if (p.includes("tiktok")) return "TikTok";
  if (p.includes("snapchat")) return "Snapchat";
  if (p === "x" || p.includes("twitter")) return "X";
  if (p.includes("facebook")) return "Facebook";
  if (p.includes("linkedin")) return "LinkedIn";
  if (p.includes("youtube")) return "YouTube";
  return platform;
}

function dayLabel(day: number) {
  return ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][day] ?? "";
}

export function PublicBusinessPageV3({ business, qrDataUrl, publicUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const departments = useMemo(
    () =>
      business.departments
        .filter((department) => department.contacts.length > 0)
        .map((department) => ({
          ...department,
          contacts: department.contacts.filter((contact) => contact.name.trim()),
        })),
    [business.departments],
  );

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(departments[0]?.id ?? null);
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) ?? departments[0] ?? null;

  const whatsapp = digits(business.whatsapp);
  const phone = String(business.phone ?? "").trim();
  const mapHref = normalizeHttpUrl(business.googleMapsLink) ||
    (business.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address, business.city].filter(Boolean).join(" "))}`
      : null);

  const destinationUrl = normalizeHttpUrl(business.website);
  const destinationType = business.digitalDestinationType === "store" ? "store" : "website";
  const destinationLabel = destinationType === "store" ? "المتجر الإلكتروني" : "الموقع الإلكتروني";

  const profileUrl = normalizeHttpUrl(business.companyProfileUrl);
  const profileTitle = business.companyProfileTitle?.trim() || "الملف التعريفي";

  const gallery = business.galleryItems.filter((item) => item.isActive).slice(0, 4);
  const services = business.services.filter((service) => service.isActive).slice(0, 4);
  const branches = business.branches.filter((branch) => branch.isActive);

  const socials = [
    ...(business.instagramUrl ? [{ platform: "instagram", url: business.instagramUrl }] : []),
    ...(business.tiktokUrl ? [{ platform: "tiktok", url: business.tiktokUrl }] : []),
    ...(business.snapchatUrl ? [{ platform: "snapchat", url: business.snapchatUrl }] : []),
    ...(business.xUrl ? [{ platform: "x", url: business.xUrl }] : []),
    ...(business.facebookUrl ? [{ platform: "facebook", url: business.facebookUrl }] : []),
    ...business.socialLinks.map((item) => ({ platform: item.platform, url: item.url })),
  ].filter((item, index, array) => array.findIndex((entry) => entry.url === item.url) === index);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const actionClass =
    "group flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-[16px] border border-slate-200/80 bg-white px-1.5 py-2 text-[10px] font-extrabold text-slate-700 shadow-[0_10px_28px_-24px_rgba(15,23,42,.45)] transition active:scale-[.98] hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:min-h-[72px] sm:rounded-[18px] sm:px-2 sm:text-[11px]";

  return (
    <main dir="rtl" data-renderer="hee-v3-smart-business-profile" className="min-h-screen bg-[#f6f8f7] text-[#11201c]">
      <div className="mx-auto w-full max-w-[1180px] px-2.5 pb-28 pt-2.5 sm:px-5 sm:pb-24 sm:pt-3 md:px-8 md:pb-10 md:pt-7">
        <section className="overflow-hidden rounded-[24px] border border-[#e4ebe7] bg-white shadow-[0_24px_70px_-44px_rgba(4,54,43,.42)] sm:rounded-[28px]">
          <div className="h-1.5 bg-gradient-to-l from-[#0e9f6e] via-[#159b78] to-[#0d6d59]" />

          <div className="p-3.5 sm:p-5 md:p-7">
            <div className="flex items-start gap-3 md:gap-5">
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[19px] border border-[#e7ece9] bg-[#f5f8f6] sm:h-[72px] sm:w-[72px] sm:rounded-[22px] md:h-[94px] md:w-[94px] md:rounded-[26px]">
                {business.logoUrl ? (
                  <Image src={business.logoUrl} alt={business.name} width={108} height={108} className="h-full w-full object-contain" unoptimized />
                ) : (
                  <span className="text-2xl font-black text-[#0d7b5a]">{business.name.charAt(0)}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start gap-1.5 sm:items-center sm:gap-2">
                      <h1 className="min-w-0 break-words text-[18px] font-black leading-[1.35] tracking-[-.02em] text-[#10211c] sm:text-[23px] md:text-[30px]">
                        {compactName(business.name)}
                      </h1>
                      {business.isVerified ? (
                        <button
                          type="button"
                          onClick={() => setVerificationOpen(true)}
                          aria-label="عرض تفاصيل التوثيق"
                          title="موثق لدى HEE"
                          className="relative mt-0.5 inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[8px] bg-[#12a86f] text-white shadow-[0_0_0_3px_#e8f8f1] transition hover:scale-105 sm:mt-0 sm:h-[23px] sm:w-[23px]"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3.4]" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600 sm:text-[12px] md:text-sm">{business.businessType}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-semibold text-slate-500 sm:mt-2 sm:text-[10px] md:text-[11px]">
                      {[business.city, business.district].filter(Boolean).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                      {business.city || business.district ? <span className="h-1 w-1 rounded-full bg-slate-300" /> : null}
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> صفحة أعمال نشطة
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShareOpen((value) => !value)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition active:scale-95 hover:border-emerald-200 hover:text-emerald-700"
                    aria-label="مشاركة الصفحة"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                {business.shortDescription ? (
                  <p className="mt-2.5 max-w-[760px] text-[10.5px] leading-[1.8] text-slate-600 sm:mt-3 sm:text-[11px] sm:leading-6 md:text-[13px] md:leading-7">
                    {business.shortDescription}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5 sm:mt-5 sm:gap-2 md:max-w-[560px] md:gap-3">
              <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target={whatsapp ? "_blank" : undefined} rel="noreferrer noopener" className={actionClass}>
                <MessageCircle className="h-[18px] w-[18px] text-[#139b70] sm:h-5 sm:w-5" /> واتساب
              </a>
              <a href={phone ? `tel:${phone}` : "#"} className={actionClass}>
                <Phone className="h-[18px] w-[18px] text-[#139b70] sm:h-5 sm:w-5" /> اتصال
              </a>
              <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel="noreferrer noopener" className={actionClass}>
                <MapPin className="h-[18px] w-[18px] text-[#139b70] sm:h-5 sm:w-5" /> الموقع
              </a>
              <button type="button" onClick={() => document.getElementById("hee-contact-directory")?.scrollIntoView({ behavior: "smooth" })} className={actionClass}>
                <Users className="h-[18px] w-[18px] text-[#139b70] sm:h-5 sm:w-5" /> التواصل
              </button>
            </div>

            {shareOpen ? (
              <div className="mt-3.5 flex items-center gap-2.5 rounded-[16px] border border-[#e3ebe7] bg-[#f8faf9] p-2.5 sm:mt-4 sm:gap-3 sm:rounded-[18px] sm:p-3">
                <img src={qrDataUrl} alt="رمز QR" className="h-14 w-14 shrink-0 rounded-xl border border-white bg-white p-1 sm:h-16 sm:w-16" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[9px] font-bold text-slate-500 sm:text-[10px]">{publicUrl}</div>
                  <button onClick={copyLink} type="button" className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[9px] font-black text-[#087653] shadow-sm active:scale-[.98] sm:mt-2 sm:text-[10px]">
                    <Copy className="h-3.5 w-3.5" /> {copied ? "تم النسخ" : "نسخ رابط الصفحة"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {socials.length > 0 ? (
          <section className="mt-2.5 overflow-x-auto rounded-[18px] border border-[#e4ebe7] bg-white px-2.5 py-2.5 shadow-[0_12px_30px_-28px_rgba(15,23,42,.5)] sm:mt-3 sm:rounded-[20px] sm:px-3 sm:py-3">
            <div className="flex min-w-max items-center gap-1.5 sm:gap-2">
              <span className="ml-1 text-[9px] font-black text-slate-500 sm:text-[10px]">حساباتنا</span>
              {socials.map((social) => (
                <a key={`${social.platform}-${social.url}`} href={social.url} target="_blank" rel="noreferrer noopener" className="rounded-full border border-slate-200 bg-[#fbfcfb] px-2.5 py-1.5 text-[9px] font-extrabold text-slate-600 transition active:scale-[.98] hover:border-emerald-200 hover:text-emerald-700 sm:px-3 sm:text-[10px]">
                  {socialLabel(social.platform)}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_.8fr]">
          {business.description ? (
            <section className="rounded-[24px] border border-[#e4ebe7] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] md:p-6">
              <div className="flex items-center gap-2"><Building2 className="h-4.5 w-4.5 text-[#0f956b]" /><h2 className="text-[16px] font-black md:text-[19px]">عن المنشأة</h2></div>
              <p className="mt-3 text-[11px] leading-6 text-slate-600 md:text-[13px] md:leading-7">{business.description}</p>
            </section>
          ) : null}
          {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer noopener" className="group relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#083f35_0%,#0b5d4c_55%,#0a7a59_100%)] p-5 text-white"><FileText className="h-5 w-5" /><h2 className="mt-8 text-[17px] font-black">{profileTitle}</h2><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black">عرض الملف <ChevronLeft className="h-3.5 w-3.5" /></span></a> : null}
        </div>

        {services.length > 0 ? <section className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4"><h2 className="text-[16px] font-black md:text-[20px]">ما نقدمه</h2><div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">{services.map((service) => <article key={service.id} className="rounded-[18px] border border-slate-200/80 bg-[#fbfcfb] p-3.5"><Check className="h-4 w-4 text-[#0d8c63]" /><h3 className="mt-3 text-[11px] font-black">{service.name}</h3></article>)}</div></section> : null}
        {gallery.length > 0 ? <section className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4"><h2 className="text-[16px] font-black md:text-[20px]">أعمالنا</h2><div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">{gallery.map((item) => <figure key={item.id} className="relative aspect-[1.35/1] overflow-hidden rounded-[18px] bg-[#e9eeeb]"><Image src={item.imageUrl} alt={item.caption || business.name} fill className="object-cover" unoptimized /></figure>)}</div></section> : null}

        {departments.length > 0 ? <section id="hee-contact-directory" className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4"><h2 className="text-[16px] font-black">تواصل مع الجهة المناسبة</h2><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{departments.map((department) => <button key={department.id} type="button" onClick={() => setSelectedDepartmentId(department.id)} className="min-w-max rounded-[15px] border border-slate-200 px-3.5 py-2.5 text-[10px] font-black">{department.name}</button>)}</div>{selectedDepartment ? <div className="mt-3 space-y-2">{selectedDepartment.contacts.map((contact) => <article key={contact.id} className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white p-3"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf6f2] font-black text-[#0b805c]">{contact.name.charAt(0)}</div><div className="min-w-0 flex-1"><h4 className="truncate text-[11px] font-black">{contact.name}</h4><p className="truncate text-[8.5px] text-slate-500">{contact.jobTitle}</p></div></article>)}</div> : null}</section> : null}

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {branches.length > 0 ? <section className="rounded-[22px] border border-[#e4ebe7] bg-white p-4"><button type="button" onClick={() => setBranchesOpen(!branchesOpen)} className="flex w-full items-center justify-between"><span className="font-black">فروعنا</span><ChevronDown className="h-4 w-4" /></button></section> : null}
          {business.openingHours.length > 0 ? <section className="rounded-[22px] border border-[#e4ebe7] bg-white p-4"><button type="button" onClick={() => setHoursOpen(!hoursOpen)} className="flex w-full items-center justify-between"><span className="font-black">ساعات العمل</span><Clock3 className="h-4 w-4" /></button></section> : null}
          {destinationUrl ? <a href={destinationUrl} target="_blank" rel="noreferrer noopener" className="rounded-[22px] border border-[#e4ebe7] bg-white p-4"><div className="flex items-center gap-3">{destinationType === "store" ? <Store className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}<span className="font-black">{destinationLabel}</span></div></a> : null}
        </div>
      </div>

      {verificationOpen ? <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4" onClick={() => setVerificationOpen(false)}><div className="w-full max-w-sm rounded-[24px] bg-white p-5" onClick={(event) => event.stopPropagation()}><h2 className="font-black">صفحة موثقة لدى HEE</h2><p className="mt-2 text-sm text-slate-600">تم التحقق من بيانات هذه المنشأة.</p></div></div> : null}
    </main>
  );
}
