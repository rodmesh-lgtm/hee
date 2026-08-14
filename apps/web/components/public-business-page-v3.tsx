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
    "group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-slate-200/80 bg-white px-2 text-[11px] font-extrabold text-slate-700 shadow-[0_10px_28px_-24px_rgba(15,23,42,.45)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md";

  return (
    <main dir="rtl" data-renderer="hee-v3-smart-business-profile" className="min-h-screen bg-[#f6f8f7] text-[#11201c]">
      <div className="mx-auto w-full max-w-[1180px] px-3 pb-24 pt-3 sm:px-5 md:px-8 md:pb-10 md:pt-7">
        <section className="overflow-hidden rounded-[28px] border border-[#e4ebe7] bg-white shadow-[0_24px_70px_-44px_rgba(4,54,43,.42)]">
          <div className="h-1.5 bg-gradient-to-l from-[#0e9f6e] via-[#159b78] to-[#0d6d59]" />

          <div className="p-4 sm:p-5 md:p-7">
            <div className="flex items-start gap-3 md:gap-5">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[#e7ece9] bg-[#f5f8f6] md:h-[94px] md:w-[94px] md:rounded-[26px]">
                {business.logoUrl ? (
                  <Image src={business.logoUrl} alt={business.name} width={108} height={108} className="h-full w-full object-contain" unoptimized />
                ) : (
                  <span className="text-2xl font-black text-[#0d7b5a]">{business.name.charAt(0)}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h1 className="max-w-[230px] truncate text-[20px] font-black tracking-[-.02em] text-[#10211c] sm:max-w-none sm:text-[23px] md:text-[30px]">
                        {compactName(business.name)}
                      </h1>
                      {business.isVerified ? (
                        <button
                          type="button"
                          onClick={() => setVerificationOpen(true)}
                          aria-label="عرض تفاصيل التوثيق"
                          title="موثق لدى HEE"
                          className="relative inline-grid h-[23px] w-[23px] shrink-0 place-items-center rounded-[8px] bg-[#12a86f] text-white shadow-[0_0_0_3px_#e8f8f1] transition hover:scale-105"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3.4]" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] font-bold text-slate-600 md:text-sm">{business.businessType}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500 md:text-[11px]">
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
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                    aria-label="مشاركة الصفحة"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                {business.shortDescription ? (
                  <p className="mt-3 max-w-[760px] text-[11px] leading-6 text-slate-600 md:text-[13px] md:leading-7">
                    {business.shortDescription}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 md:max-w-[560px] md:gap-3">
              <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target={whatsapp ? "_blank" : undefined} rel="noreferrer noopener" className={actionClass}>
                <MessageCircle className="h-5 w-5 text-[#139b70]" /> واتساب
              </a>
              <a href={phone ? `tel:${phone}` : "#"} className={actionClass}>
                <Phone className="h-5 w-5 text-[#139b70]" /> اتصال
              </a>
              <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel="noreferrer noopener" className={actionClass}>
                <MapPin className="h-5 w-5 text-[#139b70]" /> الموقع
              </a>
              <button type="button" onClick={() => document.getElementById("hee-contact-directory")?.scrollIntoView({ behavior: "smooth" })} className={actionClass}>
                <Users className="h-5 w-5 text-[#139b70]" /> التواصل
              </button>
            </div>

            {shareOpen ? (
              <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#e3ebe7] bg-[#f8faf9] p-3">
                <img src={qrDataUrl} alt="رمز QR" className="h-16 w-16 rounded-xl border border-white bg-white p-1" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-bold text-slate-500">{publicUrl}</div>
                  <button onClick={copyLink} type="button" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[10px] font-black text-[#087653] shadow-sm">
                    <Copy className="h-3.5 w-3.5" /> {copied ? "تم النسخ" : "نسخ رابط الصفحة"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {socials.length > 0 ? (
          <section className="mt-3 overflow-x-auto rounded-[20px] border border-[#e4ebe7] bg-white px-3 py-3 shadow-[0_12px_30px_-28px_rgba(15,23,42,.5)]">
            <div className="flex min-w-max items-center gap-2">
              <span className="ml-1 text-[10px] font-black text-slate-500">حساباتنا</span>
              {socials.map((social) => (
                <a key={`${social.platform}-${social.url}`} href={social.url} target="_blank" rel="noreferrer noopener" className="rounded-full border border-slate-200 bg-[#fbfcfb] px-3 py-1.5 text-[10px] font-extrabold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                  {socialLabel(social.platform)}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_.8fr]">
          {business.description ? (
            <section className="rounded-[24px] border border-[#e4ebe7] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] md:p-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-[#0f956b]" />
                <h2 className="text-[16px] font-black md:text-[19px]">عن المنشأة</h2>
              </div>
              <p className="mt-3 text-[11px] leading-6 text-slate-600 md:text-[13px] md:leading-7">{business.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold text-slate-500">
                {business.entityType ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{business.entityType}</span> : null}
                {business.businessCategory ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{business.businessCategory}</span> : null}
                {business.licenseNumber ? <span className="rounded-full bg-slate-100 px-2.5 py-1">ترخيص: {business.licenseNumber}</span> : null}
              </div>
            </section>
          ) : null}

          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noreferrer noopener" className="group relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#083f35_0%,#0b5d4c_55%,#0a7a59_100%)] p-5 text-white shadow-[0_24px_55px_-38px_rgba(3,83,63,.65)] md:p-6">
              <div className="absolute -left-10 -top-14 h-36 w-36 rounded-full bg-white/7" />
              <div className="relative flex h-full min-h-[150px] flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/12"><FileText className="h-5 w-5" /></span>
                  <ExternalLink className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <h2 className="text-[17px] font-black">{profileTitle}</h2>
                  <p className="mt-1 text-[10px] leading-5 text-white/70">عرض الملف التعريفي الرسمي للمنشأة وخبراتها.</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-white">عرض الملف <ChevronLeft className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </a>
          ) : null}
        </div>

        {services.length > 0 ? (
          <section className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-black md:text-[20px]">ما نقدمه</h2>
                <p className="mt-1 text-[9px] text-slate-500 md:text-[10px]">مختصر واضح عن الخدمات الأساسية للمنشأة</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
              {services.map((service) => (
                <article key={service.id} className="rounded-[18px] border border-slate-200/80 bg-[#fbfcfb] p-3.5 md:p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#eaf7f1] text-[#0d8c63]"><Check className="h-4 w-4" /></span>
                  <h3 className="mt-3 line-clamp-2 text-[11px] font-black leading-5 md:text-[12px]">{service.name}</h3>
                  {service.description ? <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-500">{service.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {gallery.length > 0 ? (
          <section className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-black md:text-[20px]">أعمالنا</h2>
              <span className="text-[9px] font-black text-[#0e8f68]">نماذج مختارة</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
              {gallery.map((item) => (
                <figure key={item.id} className="group relative aspect-[1.35/1] overflow-hidden rounded-[18px] bg-[#e9eeeb]">
                  <Image src={item.imageUrl} alt={item.caption || business.name} fill className="object-cover transition duration-300 group-hover:scale-[1.025]" unoptimized />
                  {item.caption ? <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-[9px] font-black text-white">{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {departments.length > 0 ? (
          <section id="hee-contact-directory" className="mt-3 rounded-[24px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] md:p-6">
            <div className="mb-4">
              <h2 className="text-[16px] font-black md:text-[20px]">تواصل مع الجهة المناسبة</h2>
              <p className="mt-1 text-[9px] text-slate-500 md:text-[10px]">اختر القسم، ثم تواصل مباشرة مع المسؤول الذي تحتاجه</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {departments.map((department) => {
                const active = department.id === selectedDepartment?.id;
                return (
                  <button key={department.id} type="button" onClick={() => setSelectedDepartmentId(department.id)} className={`min-w-max rounded-[15px] border px-3.5 py-2.5 text-right transition ${active ? "border-[#0f9f70] bg-[#eef9f4] text-[#087653] shadow-[0_8px_20px_-16px_rgba(14,159,112,.6)]" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"}`}>
                    <span className="block text-[10px] font-black md:text-[11px]">{department.name}</span>
                    <span className="mt-0.5 block text-[8px] font-semibold opacity-70">{department.contacts.length} {department.contacts.length === 1 ? "مسؤول" : "مسؤولين"}</span>
                  </button>
                );
              })}
            </div>

            {selectedDepartment ? (
              <div className="mt-3 rounded-[20px] border border-[#e5ebe8] bg-[#fafcfb] p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-black text-[#17302a] md:text-[15px]">{selectedDepartment.name}</h3>
                    {selectedDepartment.description ? <p className="mt-1 text-[9px] text-slate-500">{selectedDepartment.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-[#0b805c] shadow-sm">{selectedDepartment.contacts.length} جهة اتصال</span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {selectedDepartment.contacts.map((contact) => {
                    const contactWhatsapp = digits(contact.whatsapp);
                    const contactPhone = String(contact.phone ?? "").trim();
                    return (
                      <article key={contact.id} className="flex items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white p-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#edf6f2] text-sm font-black text-[#0b805c]">
                          {contact.imageUrl ? <Image src={contact.imageUrl} alt={contact.name} width={48} height={48} className="h-full w-full object-cover" unoptimized /> : contact.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="truncate text-[11px] font-black md:text-[12px]">{contact.name}</h4>
                            {contact.isPrimary ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black text-emerald-700">رئيسي</span> : null}
                          </div>
                          <p className="mt-0.5 truncate text-[8.5px] text-slate-500">{[contact.jobTitle, contact.branch?.name].filter(Boolean).join(" · ")}</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {contactWhatsapp ? <a href={`https://wa.me/${contactWhatsapp}`} target="_blank" rel="noreferrer noopener" aria-label={`واتساب ${contact.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><MessageCircle className="h-3.5 w-3.5" /></a> : null}
                          {contactPhone ? <a href={`tel:${contactPhone}`} aria-label={`اتصال بـ ${contact.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700"><Phone className="h-3.5 w-3.5" /></a> : null}
                          {contact.email ? <a href={`mailto:${contact.email}`} aria-label={`بريد ${contact.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-700"><Mail className="h-3.5 w-3.5" /></a> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {branches.length > 0 ? (
            <section className="rounded-[22px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)]">
              <button type="button" onClick={() => setBranchesOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-right">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f2] text-[#0c8a62]"><Building2 className="h-4.5 w-4.5" /></span>
                  <div><h2 className="text-[13px] font-black">فروعنا</h2><p className="mt-0.5 text-[8px] text-slate-500">{branches.length === 1 ? "فرع واحد" : `${branches.length} فروع`}</p></div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${branchesOpen ? "rotate-180" : ""}`} />
              </button>
              {branchesOpen ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {branches.map((branch) => {
                    const branchMap = normalizeHttpUrl(branch.googleMapsLink);
                    const branchWhatsapp = digits(branch.whatsapp);
                    return (
                      <div key={branch.id} className="rounded-[14px] bg-[#fafcfb] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div><div className="flex items-center gap-1.5"><b className="text-[10px]">{branch.name}</b>{branch.isMain ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black text-emerald-700">الرئيسي</span> : null}</div><p className="mt-1 text-[8px] leading-4 text-slate-500">{[branch.city, branch.district, branch.address].filter(Boolean).join("، ")}</p></div>
                          <div className="flex gap-1">{branchMap ? <a href={branchMap} target="_blank" rel="noreferrer noopener" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0c8a62]"><MapPin className="h-3.5 w-3.5" /></a> : null}{branchWhatsapp ? <a href={`https://wa.me/${branchWhatsapp}`} target="_blank" rel="noreferrer noopener" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0c8a62]"><MessageCircle className="h-3.5 w-3.5" /></a> : null}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}

          {business.openingHours.length > 0 ? (
            <section className="rounded-[22px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)]">
              <button type="button" onClick={() => setHoursOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-right">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f2] text-[#0c8a62]"><Clock3 className="h-4.5 w-4.5" /></span><div><h2 className="text-[13px] font-black">ساعات العمل</h2><p className="mt-0.5 text-[8px] text-slate-500">اضغط لعرض الجدول</p></div></div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${hoursOpen ? "rotate-180" : ""}`} />
              </button>
              {hoursOpen ? <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">{business.openingHours.map((entry) => <div key={entry.id} className="flex justify-between gap-3 text-[8.5px]"><span className="font-bold text-slate-600">{dayLabel(entry.dayOfWeek)}</span><span className="text-slate-500">{entry.isClosed ? "مغلق" : [entry.opensAt, entry.closesAt].filter(Boolean).join(" - ")}</span></div>)}</div> : null}
            </section>
          ) : null}

          {destinationUrl ? (
            <a href={destinationUrl} target="_blank" rel="noreferrer noopener" className="group rounded-[22px] border border-[#e4ebe7] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.42)] transition hover:border-emerald-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f2] text-[#0c8a62]">{destinationType === "store" ? <Store className="h-4.5 w-4.5" /> : <Globe2 className="h-4.5 w-4.5" />}</span><div><h2 className="text-[13px] font-black">{destinationLabel}</h2><p className="mt-0.5 max-w-[170px] truncate text-[8px] text-slate-500">{business.website}</p></div></div>
                <ExternalLink className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-700" />
              </div>
            </a>
          ) : null}
        </div>

        <footer className="mt-4 flex items-center justify-between border-t border-[#dfe7e3] px-1 py-4 text-[8.5px] text-slate-500">
          <span className="font-black text-[#0b805c]">HEE · هوية أعمال رقمية</span>
          <span>hee.sa/{business.slug}</span>
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e1e9e5] bg-white/95 px-3 py-2 shadow-[0_-10px_35px_-24px_rgba(15,23,42,.5)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-[430px] grid-cols-4 gap-1">
          <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target={whatsapp ? "_blank" : undefined} rel="noreferrer noopener" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[8px] font-black text-slate-600"><MessageCircle className="h-4 w-4 text-[#0d9468]" />واتساب</a>
          <button type="button" onClick={() => document.getElementById("hee-contact-directory")?.scrollIntoView({ behavior: "smooth" })} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[8px] font-black text-slate-600"><Users className="h-4 w-4 text-[#0d9468]" />الأقسام</button>
          <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel="noreferrer noopener" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[8px] font-black text-slate-600"><MapPin className="h-4 w-4 text-[#0d9468]" />الموقع</a>
          <button type="button" onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[8px] font-black text-slate-600"><Share2 className="h-4 w-4 text-[#0d9468]" />مشاركة</button>
        </div>
      </div>

      {verificationOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071b16]/55 p-4 backdrop-blur-sm" onClick={() => setVerificationOpen(false)}>
          <section className="w-full max-w-[390px] rounded-[26px] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[#12a86f] text-white shadow-[0_0_0_6px_#e8f8f1]"><Check className="h-7 w-7 stroke-[3.2]" /></div>
            <h2 className="mt-4 text-center text-[17px] font-black">منشأة موثقة لدى HEE</h2>
            <p className="mt-2 text-center text-[10px] leading-5 text-slate-500">شارة التوثيق تؤكد أن HEE راجعت بيانات التحقق المتاحة لهذه المنشأة.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] font-bold text-[#0b805c]">
              {phone ? <span className="rounded-xl bg-[#eef9f4] px-3 py-2">✓ رقم التواصل</span> : null}
              {whatsapp ? <span className="rounded-xl bg-[#eef9f4] px-3 py-2">✓ واتساب الأعمال</span> : null}
              {business.email ? <span className="rounded-xl bg-[#eef9f4] px-3 py-2">✓ البريد الإلكتروني</span> : null}
              {business.licenseNumber ? <span className="rounded-xl bg-[#eef9f4] px-3 py-2">✓ بيانات الترخيص</span> : null}
            </div>
            <button type="button" onClick={() => setVerificationOpen(false)} className="mt-4 w-full rounded-[14px] bg-[#0d805c] py-3 text-[11px] font-black text-white">تم</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
