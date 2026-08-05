"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock3, Percent, Sparkles, X } from "lucide-react";
import type { PublicOffer } from "./types";

type PublicOffersSectionProps = {
  offers: PublicOffer[];
  accentColor: string;
  whatsapp?: string | null;
  phone?: string | null;
  businessName?: string;
  darkMode?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
}

function countdownLabel(endsAt: string | null) {
  if (!endsAt) return null;
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return "انتهت";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} يوم متبقية`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours > 0) return `${hours} ساعة متبقية`;
  return "أقل من ساعة";
}

export function PublicOffersSection({ offers, accentColor, whatsapp, phone, businessName, darkMode = false }: PublicOffersSectionProps) {
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const activeOffers = offers;
  const activeOffer = activeOffers.find((offer) => offer.id === activeOfferId) ?? null;

  if (activeOffers.length === 0) {
    return null;
  }

  return (
    <>
      <section
        id="offers-section"
        className={`p-4 ${
          darkMode
            ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur"
            : "rounded-[20px] border border-[#f0e3f8] bg-[linear-gradient(180deg,#fff_0%,#fff9ff_100%)]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>العروض المميزة</h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${darkMode ? "border border-white/10 bg-white/5 text-slate-300" : "border border-[#eddaf8] bg-white text-[#7b3fc4]"}`}>مفيدة الآن</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {activeOffers.map((offer) => {
            const remaining = countdownLabel(offer.endsAt);
            const claimHref = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً ${businessName ?? "النشاط"}، أرغب بالاستفادة من العرض: ${offer.title}`)}` : phone ? `tel:${phone}` : undefined;

            return (
              <article
                key={offer.id}
                className={`overflow-hidden rounded-[20px] border text-right transition-all duration-300 hover:-translate-y-0.5 ${
                  darkMode
                    ? "border-white/10 bg-white/5 shadow-[0_10px_35px_rgba(2,132,199,0.12)]"
                    : "border-[#f0dcfb] bg-white shadow-[0_22px_36px_-30px_rgba(148,77,194,0.45)]"
                }`}
              >
                <div className={`grid gap-3 p-3 ${offer.imageUrl ? "grid-cols-[112px_1fr]" : "grid-cols-1"}`}>
                  {offer.imageUrl ? (
                    <div className={`relative h-[100px] overflow-hidden rounded-[16px] ${darkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                      <Image src={offer.imageUrl} alt={offer.title} width={140} height={120} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`line-clamp-1 font-bold ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{offer.title}</p>
                      {offer.discountLabel ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>
                          <Percent className="h-3 w-3" />
                          {offer.discountLabel}
                        </span>
                      ) : null}
                    </div>
                    {offer.description ? <p className={`line-clamp-2 text-xs leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{offer.description}</p> : null}
                    <div className={`flex flex-wrap items-center gap-2 text-[11px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${darkMode ? "border border-white/10 bg-white/5 text-slate-200" : "border border-[#eddaf8] bg-white text-slate-700"}`}>
                        <Clock3 className="h-3 w-3" />
                        {offer.endsAt ? `حتى ${formatDate(offer.endsAt)}` : "عرض مستمر"}
                      </span>
                      {offer.endsAt ? <span className={`rounded-full px-2 py-1 ${darkMode ? "border border-amber-400/25 bg-amber-400/10 text-amber-200" : "border border-amber-200 bg-amber-50 text-amber-700"}`}>لفترة محدودة</span> : null}
                      {remaining ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${darkMode ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200" : "border border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
                          <Sparkles className="h-3 w-3" />
                          {remaining}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button type="button" onClick={() => setActiveOfferId(offer.id)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${darkMode ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#e4e8f6] bg-white text-slate-700 hover:bg-[#f8f9ff]"}`}>عرض التفاصيل</button>
                      {claimHref ? (
                        <a href={claimHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined} className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: `${accentColor}` }}>
                          استفيد الآن
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeOffer ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/65 p-3 backdrop-blur sm:items-center sm:justify-center">
          <div className={`w-full max-w-md rounded-[24px] border p-4 ${darkMode ? "border-white/10 bg-slate-950 text-white" : "border-[#e5e8f6] bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">{activeOffer.title}</h3>
              <button type="button" onClick={() => setActiveOfferId(null)} aria-label="إغلاق" className={`rounded-xl border p-2 ${darkMode ? "border-white/15 text-slate-200" : "border-[#e5e8f6] text-slate-600"}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {activeOffer.imageUrl ? <div className="mt-3 overflow-hidden rounded-2xl"><Image src={activeOffer.imageUrl} alt={activeOffer.title} width={720} height={420} className="h-44 w-full object-cover" loading="lazy" /></div> : null}
            {activeOffer.description ? <p className={`mt-3 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{activeOffer.description}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {activeOffer.discountLabel ? <span className="rounded-full px-3 py-1 font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>خصم {activeOffer.discountLabel}</span> : null}
              {activeOffer.startsAt ? <span className={`rounded-full px-3 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>من {formatDate(activeOffer.startsAt)}</span> : null}
              {activeOffer.endsAt ? <span className={`rounded-full px-3 py-1 ${darkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>حتى {formatDate(activeOffer.endsAt)}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
