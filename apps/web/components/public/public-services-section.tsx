"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock3, Tag, X } from "lucide-react";
import type { PublicService } from "./types";

type PublicServicesSectionProps = {
  services: PublicService[];
  accentColor: string;
  whatsapp?: string | null;
  phone?: string | null;
  businessName?: string;
  title?: string;
  darkMode?: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export function PublicServicesSection({ services, accentColor, whatsapp, phone, businessName, title = "الخدمات", darkMode = false }: PublicServicesSectionProps) {
  const [activeService, setActiveService] = useState<PublicService | null>(null);

  const gridClass = (() => {
    if (services.length <= 1) return "grid-cols-1";
    if (services.length === 2) return "grid-cols-1 md:grid-cols-2";
    if (services.length === 4) return "grid-cols-1 md:grid-cols-2 xl:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  })();

  if (services.length === 0) {
    return null;
  }

  return (
    <>
      <section
        id="services-section"
        className={`p-4 ${
          darkMode
            ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur"
            : "rounded-[20px] border border-[#e8ebf7] bg-white"
        }`}
      >
        <h2 className={`mb-4 text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
        <div className={`grid gap-3 ${gridClass}`}>
          {services.map((service) => {
            const bookHref = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً ${businessName ?? "النشاط"}، أرغب بحجز ${service.name}.`)}` : phone ? `tel:${phone}` : undefined;
            return (
              <article
                key={service.id}
                className={`overflow-hidden rounded-2xl border text-right transition-all duration-300 hover:-translate-y-0.5 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.06]"
                    : "border-[#e8ebf7] bg-white shadow-[0_20px_32px_-30px_rgba(45,60,120,0.42)]"
                }`}
              >
                {service.imageUrl ? (
                  <div className={`relative h-28 w-full ${darkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                    <Image src={service.imageUrl} alt={service.name} width={420} height={220} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <div className="space-y-3 p-3">
                  <div>
                    <p className={`font-bold ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{service.name}</p>
                    <p className={`mt-1 line-clamp-2 text-xs leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{service.description}</p>
                  </div>
                  <div className={`flex flex-wrap items-center gap-2 text-xs ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {service.price > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: `${accentColor}20`, color: accentColor }}>
                        <Tag className="h-3 w-3" />
                        يبدأ من {formatPrice(service.price)}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>السعر حسب الخدمة</span>
                    )}
                    {service.durationMinutes ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                        <Clock3 className="h-3 w-3" />
                        {service.durationMinutes} دقيقة
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveService(service)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        darkMode
                          ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          : "border-[#e4e8f6] bg-white text-slate-700 hover:bg-[#f8f9ff]"
                      }`}
                    >
                      عرض التفاصيل
                    </button>
                    {bookHref ? <a href={bookHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined} className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm" style={{ background: `${accentColor}` }}>احجز الآن</a> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeService ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/65 p-3 backdrop-blur sm:items-center sm:justify-center">
          <div className={`w-full max-w-md rounded-[24px] border p-4 ${darkMode ? "border-white/10 bg-slate-950 text-white" : "border-[#e5e8f6] bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">{activeService.name}</h3>
              <button type="button" onClick={() => setActiveService(null)} aria-label="إغلاق" className={`rounded-xl border p-2 ${darkMode ? "border-white/15 text-slate-200" : "border-[#e5e8f6] text-slate-600"}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {activeService.imageUrl ? <div className="mt-3 overflow-hidden rounded-2xl"><Image src={activeService.imageUrl} alt={activeService.name} width={720} height={420} className="mt-3 h-44 w-full rounded-2xl object-cover" loading="lazy" /></div> : null}
            <p className={`mt-3 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{activeService.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {activeService.price > 0 ? (
                <span className="rounded-full px-3 py-1 font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>
                  {formatPrice(activeService.price)}
                </span>
              ) : (
                <span className={`rounded-full px-3 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>السعر حسب الخدمة</span>
              )}
              {activeService.durationMinutes ? <span className={`rounded-full px-3 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{activeService.durationMinutes} دقيقة</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
