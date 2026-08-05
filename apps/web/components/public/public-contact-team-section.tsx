"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Mail, MessageCircle, Phone } from "lucide-react";
import type { ContactTeamMember } from "../../app/lib/page-modules";

type PublicContactTeamSectionProps = {
  salesTeam: ContactTeamMember[];
  customerServiceTeam: ContactTeamMember[];
  darkMode?: boolean;
};

function visibleMembers(input: ContactTeamMember[]) {
  return input
    .filter((member) => member.visible !== false && member.name?.trim())
    .slice(0, 3)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
}

function TeamCarousel({
  id,
  title,
  members,
  darkMode,
}: {
  id: string;
  title: string;
  members: ContactTeamMember[];
  darkMode: boolean;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  if (members.length === 0) {
    return null;
  }

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateScrollState = () => {
      const maxOffset = rail.scrollWidth - rail.clientWidth;
      if (maxOffset <= 1) {
        setCanScrollPrev(false);
        setCanScrollNext(false);
        return;
      }

      const left = rail.scrollLeft;
      setCanScrollPrev(left < -2);
      setCanScrollNext(left > -(maxOffset - 2));
    };

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [members.length]);

  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-white"}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h3>
        {canScrollPrev || canScrollNext ? (
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => railRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
            disabled={!canScrollPrev}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${darkMode ? "border-white/15 text-slate-200" : "border-[#dee4f7] text-slate-600"}`}
            aria-label={`تحريك ${id} للخلف`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => railRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
            disabled={!canScrollNext}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${darkMode ? "border-white/15 text-slate-200" : "border-[#dee4f7] text-slate-600"}`}
            aria-label={`تحريك ${id} للأمام`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        ) : null}
      </div>

      <div ref={railRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:hidden" dir="rtl">
        {members.map((member) => (
          <article key={member.id} className={`w-[86%] min-w-[250px] max-w-[320px] snap-start rounded-xl border p-3 ${darkMode ? "border-white/10 bg-slate-900/55" : "border-[#e7ecfa] bg-[#fbfcff]"}`}>
            <div className="flex items-center gap-2">
              <div className={`h-12 w-12 overflow-hidden rounded-full border ${darkMode ? "border-white/15 bg-[#121f3d]" : "border-[#dfe6f8] bg-white"}`}>
                {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black leading-6 ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{member.name}</p>
                {member.title ? <p className={`text-xs leading-5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{member.title}</p> : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {member.whatsapp ? (
                <a href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  واتساب
                </a>
              ) : null}
              {member.phone ? (
                <a href={`tel:${member.phone}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <Phone className="h-3.5 w-3.5" />
                  اتصال
                </a>
              ) : null}
              {member.email ? (
                <a href={`mailto:${member.email}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <Mail className="h-3.5 w-3.5" />
                  بريد
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className={`hidden gap-2 md:grid ${members.length === 1 ? "md:grid-cols-1" : members.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {members.map((member) => (
          <article key={`${member.id}-desktop`} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-slate-900/55" : "border-[#e7ecfa] bg-[#fbfcff]"}`}>
            <div className="flex items-center gap-2">
              <div className={`h-12 w-12 overflow-hidden rounded-full border ${darkMode ? "border-white/15 bg-[#121f3d]" : "border-[#dfe6f8] bg-white"}`}>
                {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black leading-6 ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{member.name}</p>
                {member.title ? <p className={`text-xs leading-5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{member.title}</p> : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {member.whatsapp ? (
                <a href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  واتساب
                </a>
              ) : null}
              {member.phone ? (
                <a href={`tel:${member.phone}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <Phone className="h-3.5 w-3.5" />
                  اتصال
                </a>
              ) : null}
              {member.email ? (
                <a href={`mailto:${member.email}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  <Mail className="h-3.5 w-3.5" />
                  بريد
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PublicContactTeamSection({ salesTeam, customerServiceTeam, darkMode = false }: PublicContactTeamSectionProps) {
  const sales = visibleMembers(salesTeam);
  const support = visibleMembers(customerServiceTeam);

  if (sales.length === 0 && support.length === 0) {
    return null;
  }

  return (
    <section id="contact-team-section" className={`space-y-3 p-4 ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>فريق التواصل</h2>
      <TeamCarousel id="sales-team" title="فريق المبيعات" members={sales} darkMode={darkMode} />
      <TeamCarousel id="support-team" title="خدمة العملاء" members={support} darkMode={darkMode} />
    </section>
  );
}
