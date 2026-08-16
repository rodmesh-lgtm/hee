"use client";

import { useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  Copy,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
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
    departments: { include: { contacts: { include: { branch: true } } } };
  };
}>;

type Props = {
  business: BusinessPublicPayload;
  qrDataUrl: string;
  publicUrl: string;
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const validPhone = (value?: string | null) => {
  const d = onlyDigits(value);
  return d.length >= 8 && d.length <= 15 ? d : null;
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

export function PublicBusinessPageV4({ business, qrDataUrl, publicUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);

  const whatsapp = validPhone(business.whatsapp);
  const phone = validPhone(business.phone);
  const location = [business.city, business.district].filter(Boolean).join("، ");

  const services = business.services.filter((item) => item.isActive);
  const branches = business.branches.filter((item) => item.isActive);

  const contacts = useMemo(() => {
    return business.departments
      .filter((department) => department.isActive)
      .flatMap((department) =>
        department.contacts
          .filter((contact) => contact.isActive && contact.name.trim())
          .map((contact) => ({
            ...contact,
            departmentName: department.name,
            safePhone: validPhone(contact.phone),
            safeWhatsapp: validPhone(contact.whatsapp),
            safeEmail: validEmail(contact.email),
            safeImage: validHttpUrl(contact.imageUrl),
          }))
      )
      .filter((contact) => contact.safePhone || contact.safeWhatsapp);
  }, [business.departments]);

  const rawDescription = String(business.shortDescription || business.description || "").trim();
  const aboutText = rawDescription && rawDescription !== business.name.trim()
    ? rawDescription
    : `${business.name} — الصفحة الرسمية للمنشأة على HEE، وتجمع أهم معلومات النشاط وطرق التواصل في مكان واحد.`;

  const mapHref = validHttpUrl(business.googleMapsLink) ||
    (business.address || business.city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [business.address, business.city, business.district].filter(Boolean).join(" ")
        )}`
      : null);

  const primaryContact = contacts[0] ?? null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <main
      dir="rtl"
      data-renderer="hee-v4-approved-profile"
      className="min-h-screen bg-[#eef4f1] px-2 py-3 text-[#1f2937] sm:px-4 sm:py-6"
    >
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_-35px_rgba(7,67,52,.28)] ring-1 ring-[#dfe9e4]">
        <section className="px-5 pb-5 pt-6 text-center sm:px-7">
          <div className="relative mx-auto grid h-[86px] w-[86px] place-items-center overflow-hidden rounded-full bg-[#f3f7f5] text-[#0d6c55] ring-1 ring-[#d9e5df]">
            {business.logoUrl && validHttpUrl(business.logoUrl) ? (
              <Image
                src={business.logoUrl}
                alt={business.name}
                width={86}
                height={86}
                unoptimized
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-[38px] font-black">{business.name.charAt(0)}</span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <h1 className="text-[20px] font-black tracking-[-.02em] text-[#20252b]">
              {business.name}
            </h1>
            {business.isVerified ? (
              <BadgeCheck className="h-5 w-5 fill-[#0b9b72] text-white" />
            ) : null}
          </div>

          {business.businessType ? (
            <p className="mt-1 text-[10px] font-bold text-[#65736d]">
              {business.businessType}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f1] px-3 py-1.5 text-[9px] font-black text-[#37685a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#24ad7a]" />
              صفحة نشطة
            </span>
            {location ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f4] px-3 py-1.5 text-[9px] font-bold text-[#727b77]">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            ) : null}
          </div>

          <div className="mx-auto mt-6 h-px w-full bg-[#edf0ef]" />

          <div className="grid grid-cols-3 gap-2 py-4 text-center">
            <div>
              <p className="text-[10px] font-black text-[#355f54]">تواصل مباشر</p>
              <p className="mt-1 text-[8px] font-medium text-[#9aa39f]">بدون وسطاء</p>
            </div>
            <div className="border-x border-[#edf0ef]">
              <p className="text-[10px] font-black text-[#355f54]">
                {services.length ? `${services.length} خدمات` : "صفحة موحدة"}
              </p>
              <p className="mt-1 text-[8px] font-medium text-[#9aa39f]">كل المعلومات هنا</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-[#355f54]">على HEE</p>
              <p className="mt-1 text-[8px] font-medium text-[#9aa39f]">هوية رقمية للأعمال</p>
            </div>
          </div>

          <div className="mt-1 space-y-2.5">
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#0d6c55] text-[10px] font-black text-white shadow-[0_10px_24px_-16px_rgba(13,108,85,.8)] transition active:scale-[.99]"
              >
                تواصل عبر واتساب
                <MessageCircle className="h-4 w-4" />
              </a>
            ) : null}

            {contacts.length ? (
              <button
                type="button"
                onClick={() => document.getElementById("hee-contact-directory")?.scrollIntoView({ behavior: "smooth" })}
                className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[13px] border border-[#d7e1dc] bg-white text-[10px] font-black text-[#4f5c57] transition active:scale-[.99]"
              >
                تواصل مع الفريق مباشرة
                <Users className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>

        <div className="h-2 bg-[#f6f8f7]" />

        <section className="px-5 py-5 sm:px-7">
          <div className="rounded-[18px] border border-[#e3e9e6] bg-white p-4 shadow-[0_9px_28px_-24px_rgba(5,55,43,.35)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-black text-[#2e3533]">عن المنشأة</h2>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf6f1] text-[#14745b]">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-[9px] font-medium leading-6 text-[#6f7975]">{aboutText}</p>
          </div>

          <section id="hee-contact-directory" className="mt-3 rounded-[18px] border border-[#e3e9e6] bg-white p-4 shadow-[0_9px_28px_-24px_rgba(5,55,43,.35)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-right">
                <h2 className="text-[12px] font-black text-[#2e3533]">تواصل مع الجهة المناسبة</h2>
                <p className="mt-1 text-[8px] font-medium text-[#98a19d]">وصول سريع حسب احتياجك</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf6f1] text-[#14745b]">
                <Headset className="h-4 w-4" />
              </span>
            </div>

            {primaryContact ? (
              <article className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#edf0ef] bg-[#fbfcfb] p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#156f59] ring-1 ring-[#dfe7e3]">
                  {primaryContact.safeImage ? (
                    <Image
                      src={primaryContact.safeImage}
                      alt={primaryContact.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Headset className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <h3 className="truncate text-[10px] font-black text-[#323a37]">
                    {primaryContact.name || primaryContact.departmentName}
                  </h3>
                  <p className="mt-1 truncate text-[8px] font-medium text-[#8a9490]">
                    {primaryContact.jobTitle || primaryContact.departmentName}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {primaryContact.safePhone ? (
                    <a
                      href={`tel:${primaryContact.safePhone}`}
                      aria-label="اتصال"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#256f5c] ring-1 ring-[#e1e8e5]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {primaryContact.safeWhatsapp ? (
                    <a
                      href={`https://wa.me/${primaryContact.safeWhatsapp}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="واتساب"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#256f5c] ring-1 ring-[#e1e8e5]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {primaryContact.safeEmail ? (
                    <a
                      href={`mailto:${primaryContact.safeEmail}`}
                      aria-label="البريد الإلكتروني"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#256f5c] ring-1 ring-[#e1e8e5]"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            ) : (
              <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#edf0ef] bg-[#fbfcfb] p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#156f59] ring-1 ring-[#dfe7e3]">
                  <Headset className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <h3 className="text-[10px] font-black text-[#323a37]">خدمة العملاء</h3>
                  <p className="mt-1 text-[8px] font-medium text-[#8a9490]">للاستفسارات والمساعدة العامة</p>
                </div>
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label="واتساب"
                    className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#256f5c] ring-1 ring-[#e1e8e5]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            )}
          </section>

          {branches.length ? (
            <section className="mt-3 overflow-hidden rounded-[18px] border border-[#e3e9e6] bg-white shadow-[0_9px_28px_-24px_rgba(5,55,43,.35)]">
              <button
                type="button"
                onClick={() => setBranchesOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 p-4 text-right"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf6f1] text-[#14745b]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[11px] font-black text-[#2e3533]">فروعنا</h2>
                    <p className="mt-1 text-[8px] font-medium text-[#98a19d]">
                      {branches.length} {branches.length === 1 ? "فرع" : "فروع"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-[#7f8a85] transition ${branchesOpen ? "rotate-180" : ""}`} />
              </button>

              {branchesOpen ? (
                <div className="border-t border-[#edf0ef] px-4 py-3">
                  <div className="space-y-2">
                    {branches.map((branch) => {
                      const branchMap = validHttpUrl(branch.googleMapsLink) ||
                        ([branch.address, branch.city, branch.district].filter(Boolean).length
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              [branch.address, branch.city, branch.district].filter(Boolean).join(" ")
                            )}`
                          : null);
                      return (
                        <div key={branch.id} className="rounded-[13px] bg-[#f8faf9] p-3">
                          <p className="text-[9px] font-black text-[#3d4844]">{branch.name || "فرع"}</p>
                          <p className="mt-1 text-[8px] leading-5 text-[#8a9490]">
                            {[branch.city, branch.district, branch.address].filter(Boolean).join("، ") || "تفاصيل الموقع غير متاحة"}
                          </p>
                          {branchMap ? (
                            <a href={branchMap} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-[8px] font-black text-[#176d58]">
                              فتح الموقع
                              <MapPin className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 flex items-center justify-between rounded-[18px] border border-[#e3e9e6] bg-white p-4 shadow-[0_9px_28px_-24px_rgba(5,55,43,.35)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf6f1] text-[#14745b]">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="text-right">
                  <h2 className="text-[11px] font-black text-[#2e3533]">الموقع</h2>
                  <p className="mt-1 text-[8px] font-medium text-[#98a19d]">فتح الموقع على الخريطة</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 -rotate-90 text-[#7f8a85]" />
            </a>
          ) : null}

          {shareOpen ? (
            <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#e3e9e6] bg-[#f9fbfa] p-3">
              <img src={qrDataUrl} alt="QR" className="h-14 w-14 rounded-lg bg-white p-1 ring-1 ring-[#e2e8e5]" />
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-[8px] text-[#87918d]">{publicUrl}</p>
                <button onClick={copyLink} className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-[#176d58]">
                  <Copy className="h-3 w-3" />
                  {copied ? "تم النسخ" : "نسخ الرابط"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShareOpen((value) => !value)}
            className="mx-auto mt-5 flex items-center gap-1.5 text-[8px] font-bold text-[#94a09b]"
          >
            <Share2 className="h-3.5 w-3.5" />
            مشاركة صفحة المنشأة
          </button>
        </section>
      </div>
    </main>
  );
}
